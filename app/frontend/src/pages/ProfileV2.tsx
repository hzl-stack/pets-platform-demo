import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, User, LogOut, Star, Award, Edit, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatToShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string;
  experience: number;
  level: number;
  points: number;
  created_at: string;
}

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

export default function ProfileV2() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userType, setUserType] = useState<'customer' | 'seller'>('customer');
  const [myShop, setMyShop] = useState<Shop | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [inspectorEligibility, setInspectorEligibility] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      await loadUserProfile();
      await loadUserData();
      await checkInspectorStatus();
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

  const loadUserProfile = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/user_system/profile',
        method: 'GET',
      });
      setUserProfile(response.data);
      setNewUsername(response.data.username);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadUserData = async () => {
    try {
      // Check if user has a shop (using shops_v2)
      const shopResponse = await client.entities.shops_v2.query({});
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

  const checkInspectorStatus = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/user_system/inspector/eligibility',
        method: 'GET',
      });
      setInspectorEligibility(response.data);
    } catch (error) {
      console.error('Failed to check inspector eligibility:', error);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      toast({
        title: '用户名不能为空',
        variant: 'destructive',
      });
      return;
    }

    try {
      await client.apiCall.invoke({
        url: '/api/v1/user_system/username',
        method: 'PUT',
        data: { username: newUsername },
      });

      toast({
        title: '更新成功',
      });
      setIsEditingUsername(false);
      loadUserProfile();
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await client.auth.logout();
      
      setUser(null);
      setUserProfile(null);
      setMyShop(null);
      setMyOrders([]);
      
      toast({
        title: '已退出登录',
      });
      
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

  const calculateExpProgress = () => {
    if (!userProfile) return 0;
    const currentLevelExp = (userProfile.level - 1) * 100;
    const nextLevelExp = userProfile.level * 100;
    const progress = ((userProfile.experience - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
    return Math.min(100, Math.max(0, progress));
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

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* User Info Card */}
        <Card className="mb-8 bg-gradient-to-br from-pink-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={userProfile.avatar_url}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    {userProfile.level}
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h2 className="text-2xl font-bold">{userProfile.username}</h2>
                    <Dialog open={isEditingUsername} onOpenChange={setIsEditingUsername}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>修改用户名</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="输入新用户名"
                          />
                          <Button onClick={handleUpdateUsername} className="w-full">
                            确认修改
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-gradient-to-r from-pink-500 to-purple-600">
                      <Award className="mr-1 h-3 w-3" />
                      等级 {userProfile.level}
                    </Badge>
                    <Badge className={userType === 'seller' ? 'bg-purple-500' : 'bg-cyan-500'}>
                      {userType === 'seller' ? '商家' : '个人用户'}
                    </Badge>
                    {inspectorEligibility?.eligible && (
                      <Badge className="bg-green-500">
                        <Shield className="mr-1 h-3 w-3" />
                        可申请检察团
                      </Badge>
                    )}
                  </div>
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

            {/* Experience Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">经验值</span>
                <span className="font-semibold">
                  {userProfile.experience} / {userProfile.level * 100}
                </span>
              </div>
              <Progress value={calculateExpProgress()} className="h-3" />
              <p className="text-xs text-gray-500">
                距离下一级还需 {userProfile.level * 100 - userProfile.experience} 经验
              </p>
            </div>

            {/* Points Display */}
            <div className="flex items-center justify-between bg-white rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="text-gray-600">积分</span>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{userProfile.points}</span>
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
                        <Badge className={myShop.status === 'active' || myShop.status === 'approved' ? 'bg-green-500' : myShop.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'}>
                          {myShop.status === 'active' || myShop.status === 'approved' ? '营业中' : myShop.status === 'pending' ? '审核中' : '已关闭'}
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