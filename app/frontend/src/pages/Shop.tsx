import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const client = createClient();

interface Product {
  id: number;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  status: string;
  created_at: string;
}

export default function Shop() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const { toast } = useToast();
  const navigate = useNavigate();

  const categories = ['全部', '食品', '玩具', '用品', '医疗'];

  useEffect(() => {
    checkAuth();
    loadProducts();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await client.entities.products.query({
        query: { status: 'active' },
        sort: '-created_at',
      });
      setProducts(response.data.items || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleAddToCart = async (productId: number) => {
    if (!user) {
      toast({
        title: '请先登录',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if item already in cart
      const cartResponse = await client.entities.cart_items.query({
        query: { product_id: productId },
      });

      if (cartResponse.data.items && cartResponse.data.items.length > 0) {
        // Update quantity
        const cartItem = cartResponse.data.items[0];
        await client.entities.cart_items.update({
          id: cartItem.id.toString(),
          data: {
            quantity: cartItem.quantity + 1,
          },
        });
      } else {
        // Create new cart item
        await client.entities.cart_items.create({
          data: {
            product_id: productId,
            quantity: 1,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
        });
      }

      toast({
        title: '已添加到购物车',
      });
    } catch (error: any) {
      toast({
        title: '添加失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const filteredProducts = selectedCategory === '全部'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Banner */}
        <div
          className="relative h-[300px] rounded-3xl overflow-hidden mb-8 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/772b1972-4869-4caa-9ba3-fea5873bf463.png)',
          }}
        >
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-5xl font-bold mb-4">宠物商城</h1>
              <p className="text-xl">为您的爱宠精选优质商品</p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className={
                selectedCategory === category
                  ? 'bg-pink-500 hover:bg-pink-600 text-white rounded-full'
                  : 'rounded-full'
              }
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <CardHeader className="p-0">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              </CardHeader>
              <CardContent className="p-4">
                <Badge className="mb-2 bg-cyan-500">{product.category}</Badge>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-pink-500">¥{product.price}</span>
                  <span className="text-sm text-gray-500">库存: {product.stock}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product.id);
                  }}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  加入购物车
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}