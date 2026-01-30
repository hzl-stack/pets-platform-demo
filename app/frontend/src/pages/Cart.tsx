import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Trash2, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const client = createClient();

interface CartItem {
  id: number;
  user_id: string;
  product_id: number;
  quantity: number;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
}

interface CartItemWithProduct extends CartItem {
  product?: Product;
}

export default function Cart() {
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      loadCart();
    } catch (error) {
      navigate('/');
    }
  };

  const loadCart = async () => {
    try {
      const cartResponse = await client.entities.cart_items.query({});
      const items = cartResponse.data.items || [];

      // Load product details for each cart item
      const itemsWithProducts = await Promise.all(
        items.map(async (item: CartItem) => {
          try {
            const productResponse = await client.entities.products.get({
              id: item.product_id.toString(),
            });
            return { ...item, product: productResponse.data };
          } catch (error) {
            return item;
          }
        })
      );

      setCartItems(itemsWithProducts);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      await client.entities.cart_items.update({
        id: itemId.toString(),
        data: { quantity: newQuantity },
      });
      loadCart();
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await client.entities.cart_items.delete({ id: itemId.toString() });
      toast({
        title: '已从购物车移除',
      });
      loadCart();
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity;
    }, 0);
  };

  if (!user) {
    return null;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-gray-600 text-lg mb-4">购物车是空的</p>
              <Button
                onClick={() => navigate('/shop')}
                className="bg-pink-500 hover:bg-pink-600 text-white rounded-full"
              >
                去逛逛
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">购物车</h1>

        <div className="space-y-4 mb-8">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.product?.image_url}
                    alt={item.product?.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{item.product?.name}</h3>
                    <p className="text-2xl font-bold text-pink-500">¥{item.product?.price}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= (item.product?.stock || 0)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">订单总计</h3>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>总计:</span>
              <span className="text-pink-500">¥{calculateTotal().toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-full py-6 text-lg">
              去结算
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}