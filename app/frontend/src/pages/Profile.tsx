import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, User, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatToShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

interface Shop {
  id: number;
  user_id: string;
  shop_name: string;
  description: string;
  logo_url: string;
  status: string;
  created_at: string;
}

interface Order {
  id: number;
  user_id: string;
  shop_id: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'customer' | 'seller'>('customer');
  const [myShop, setMyShop] = useState<Shop | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      await loadUserData();
      setLoading(false);
    } catch (error) {
      toast({
        title: '请先登录',
        description: '您需要登录才能访问个人中心',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const loadUserData = async () => {
    try {
      // Check if user has a shop
      const shopResponse = await client.entities.shops.query({});
      if (shopResponse.data.items && shopResponse.data.items.length > 0) {
        setMyShop(shopResponse.data.items[0]);
        setUserType('seller');
      }

      // Load orders
      const ordersResponse = await client.entities.orders.query({
        sort: '-created_at',
      });
      setMyOrders(ordersResponse.data.items || []);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await client.auth.logout();
      
      // Clear local state
      setUser(null);
      setMyShop(null);
      setMyOrders([]);
      
      toast({
        title: '已退出登录',
      });
      
      // Force page reload to clear all state
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: '退出失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const switchToSeller = () => {
    navigate('/seller/register');
  };

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
      <div className="container mx-auto px-4 max-w-6xl">
        {/* User Info Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user.email || '用户'}</h2>
                  <Badge className={userType === 'seller' ? 'bg-purple-500' : 'bg-cyan-500'}>
                    {userType === 'seller' ? '商家' : '个人用户'}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="rounded-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={userType === 'seller' ? 'shop' : 'orders'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">
              <ShoppingBag className="mr-2 h-4 w-4" />
              我的订单
            </TabsTrigger>
            <TabsTrigger value="shop">
              <Store className="mr-2 h-4 w-4" />
              {myShop ? '我的店铺' : '开店'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>订单列表</CardTitle>
              </CardHeader>
              <CardContent>
                {myOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>暂无订单</p>
                    <Button
                      onClick={() => navigate('/shop')}
                      className="mt-4 bg-pink-500 hover:bg-pink-600 text-white rounded-full"
                    >
                      去购物
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">订单号: {order.id}</p>
                            <p className="text-sm text-gray-600">
                              下单时间: {formatToShanghaiTime(order.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-pink-500">
                              ¥{order.total_amount.toFixed(2)}
                            </p>
                            <Badge
                              className={
                                order.status === 'completed'
                                  ? 'bg-green-500'
                                  : order.status === 'paid'
                                  ? 'bg-blue-500'
                                  : 'bg-gray-500'
                              }
                            >
                              {order.status === 'completed'
                                ? '已完成'
                                : order.status === 'paid'
                                ? '已支付'
                                : order.status === 'pending'
                                ? '待支付'
                                : '已取消'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shop" className="mt-6">
            {myShop ? (
              <Card>
                <CardHeader>
                  <CardTitle>店铺信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-6">
                    <img
                      src={myShop.logo_url}
                      alt={myShop.shop_name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{myShop.shop_name}</h3>
                      <p className="text-gray-600 mb-4">{myShop.description}</p>
                      <div className="flex space-x-4">
                        <Button
                          onClick={() => navigate('/seller')}
                          className="bg-purple-500 hover:bg-purple-600 text-white rounded-full"
                        >
                          管理商品
                        </Button>
                        <Badge className={myShop.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                          {myShop.status === 'active' ? '营业中' : '已关闭'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Store className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">还没有店铺？</h3>
                  <p className="text-gray-600 mb-6">立即开店,开启您的宠物用品销售之旅</p>
                  <Button
                    onClick={switchToSeller}
                    className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-8"
                  >
                    <Store className="mr-2 h-4 w-4" />
                    立即开店
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}