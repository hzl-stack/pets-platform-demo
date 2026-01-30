import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getCurrentShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  shop_id: number;
}

interface CartItemWithProduct extends CartItem {
  product: Product;
}

export default function Cart() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      await loadCart();
      setLoading(false);
    } catch (error) {
      toast({
        title: '请先登录',
        description: '您需要登录才能访问购物车',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const loadCart = async () => {
    try {
      const response = await client.entities.cart_items.query({});
      const items = response.data.items || [];

      // Load product details for each cart item
      const itemsWithProducts = await Promise.all(
        items.map(async (item: CartItem) => {
          try {
            const productResponse = await client.entities.products.get({
              id: item.product_id.toString(),
            });
            return {
              ...item,
              product: productResponse.data,
            };
          } catch (error) {
            return null;
          }
        })
      );

      setCartItems(itemsWithProducts.filter((item) => item !== null) as CartItemWithProduct[]);
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
        title: '已移除',
      });
      loadCart();
    } catch (error: any) {
      toast({
        title: '移除失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const checkout = async () => {
    if (cartItems.length === 0) {
      toast({
        title: '购物车为空',
        variant: 'destructive',
      });
      return;
    }

    try {
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      // Create order
      const orderResponse = await client.entities.orders.create({
        data: {
          shop_id: cartItems[0].product.shop_id,
          total_amount: totalAmount,
          status: 'completed',
          created_at: getCurrentShanghaiTime(),
        },
      });

      const orderId = orderResponse.data.id;

      // Create order items
      await Promise.all(
        cartItems.map((item) =>
          client.entities.order_items.create({
            data: {
              order_id: orderId,
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.product.price,
              created_at: getCurrentShanghaiTime(),
            },
          })
        )
      );

      // Clear cart
      await Promise.all(
        cartItems.map((item) =>
          client.entities.cart_items.delete({ id: item.id.toString() })
        )
      );

      toast({
        title: '下单成功',
        description: '订单已完成（测试版）',
      });

      navigate('/profile');
    } catch (error: any) {
      toast({
        title: '下单失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          购物车
        </h1>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 text-lg mb-6">购物车是空的</p>
              <Button
                onClick={() => navigate('/shop')}
                className="bg-pink-500 hover:bg-pink-600 text-white rounded-full"
              >
                去购物
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.product.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {item.product.description}
                        </p>
                        <p className="text-pink-500 font-bold mt-2">
                          ¥{item.product.price} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>订单总计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg">商品总额：</span>
                  <span className="text-3xl font-bold text-pink-500">
                    ¥{totalAmount.toFixed(2)}
                  </span>
                </div>
                <Button
                  onClick={checkout}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full py-6 text-lg"
                >
                  结算
                </Button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  测试版：所有商品价格为0元，订单自动完成
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}