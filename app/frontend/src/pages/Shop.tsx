import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, Search, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runMigration } from '@/utils/migration';

const client = createClient();

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  status: string;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [migrationDone, setMigrationDone] = useState(false);
  const { toast } = useToast();

  const categories = ['all', '食品', '玩具', '用品', '医疗'];

  useEffect(() => {
    checkAuth();
    runDatabaseMigration();
  }, []);

  const runDatabaseMigration = async () => {
    try {
      await runMigration();
      setMigrationDone(true);
      loadProducts();
    } catch (error) {
      console.error('Migration failed, trying to load products anyway:', error);
      loadProducts();
    }
  };

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
      setFilteredProducts(response.data.items || []);
    } catch (error: any) {
      console.error('Failed to load products:', error);
      toast({
        title: '加载商品失败',
        description: error?.data?.detail || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, searchQuery, products]);

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = async (productId: number) => {
    if (!user) {
      toast({
        title: '请先登录',
        description: '您需要登录才能添加商品到购物车',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if product already in cart
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
        // Add new item
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            宠物商城
          </h1>

          {/* Guest Notice */}
          {!user && (
            <Card className="mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <LogIn className="h-5 w-5 text-pink-500" />
                    <p className="text-sm text-gray-700">
                      您当前以游客身份浏览，登录后可添加商品到购物车
                    </p>
                  </div>
                  <Button
                    onClick={() => client.auth.toLogin()}
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600 text-white rounded-full"
                  >
                    登录
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="搜索商品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 rounded-full">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? '全部分类' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-gray-600 text-lg">暂无商品</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="p-0">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                    <Badge className="bg-cyan-500">{product.category}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-pink-500">
                        ¥{product.price}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        库存: {product.stock}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    onClick={() => addToCart(product.id)}
                    disabled={product.stock === 0 || !user}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {product.stock === 0 ? '已售罄' : !user ? '登录后购买' : '加入购物车'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}