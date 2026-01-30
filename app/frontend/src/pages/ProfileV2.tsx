import { useEffect, useState, useRef } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Star, Award, TrendingUp, ShoppingBag, Store, LogOut, Edit, Camera, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'customer' | 'seller'>('customer');
  const [myShop, setMyShop] = useState<Shop | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [inspectorEligibility, setInspectorEligibility] = useState<any>(null);
  const [isInspector, setIsInspector] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      await loadUserProfile();
      await loadUserData();
      setLoading(false);
    } catch (error) {
      toast({
        title: '请先登录',
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
      setAvatarPreview(response.data.avatar_url);

      // Check inspector eligibility
      const eligibilityResponse = await client.apiCall.invoke({
        url: '/api/v1/user_system/experience',
        method: 'POST',
        data: { action_type: 'check_inspector' },
      });
      setInspectorEligibility(eligibilityResponse.data);

      // Check if user is inspector
      const inspectorResponse = await client.apiCall.invoke({
        url: '/api/v1/inspectors/me',
        method: 'GET',
      });
      setIsInspector(inspectorResponse.data.is_inspector);
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
        limit: 10,
      });
      setMyOrders(ordersResponse.data.items || []);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    await client.auth.logout();
    setUser(null);
    setUserProfile(null);
    setMyShop(null);
    setMyOrders([]);
    window.location.href = '/';
  };

  const switchToSeller = () => {
    navigate('/seller/register');
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
        title: '用户名更新成功',
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: '请选择图片文件',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '图片大小不能超过5MB',
        variant: 'destructive',
      });
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploadingAvatar(true);
    try {
      const uploadResult = await client.storage.upload({
        bucket_name: 'avatars',
        file: file,
      });

      // Update avatar URL in backend
      await client.apiCall.invoke({
        url: '/api/v1/user_system/avatar',
        method: 'PUT',
        data: { avatar_url: uploadResult },
      });

      toast({
        title: '头像上传成功',
      });

      loadUserProfile();
    } catch (error: any) {
      toast({
        title: '上传失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
      // Restore previous avatar
      setAvatarPreview(userProfile?.avatar_url || '');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleApplyInspector = async () => {
    try {
      await client.apiCall.invoke({
        url: '/api/v1/inspectors/apply',
        method: 'POST',
      });

      toast({
        title: '恭喜您成为检察团成员！',
      });

      setIsInspector(true);
    } catch (error: any) {
      toast({
        title: '申请失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
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

  const experienceToNextLevel = (userProfile.level + 1) * 100;
  const currentLevelExp = userProfile.level * 100;
  const expProgress = ((userProfile.experience - currentLevelExp) / (experienceToNextLevel - currentLevelExp)) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* User Profile Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500"></div>
          <CardContent className="relative pt-0 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 -mt-16">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-500">
                      <User className="h-16 w-16 text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {isEditingUsername ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button onClick={handleUpdateUsername} size="sm">
                        保存
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingUsername(false);
                          setNewUsername(userProfile.username);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold">{userProfile.username}</h1>
                      <Button
                        onClick={() => setIsEditingUsername(true)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    <Award className="mr-1 h-4 w-4" />
                    等级 {userProfile.level}
                  </Badge>
                  <Badge className="bg-gradient-to-r from-blue-400 to-purple-500 text-white">
                    <Star className="mr-1 h-4 w-4" />
                    {userProfile.points} 积分
                  </Badge>
                  {isInspector && (
                    <Badge className="bg-gradient-to-r from-green-400 to-blue-500 text-white">
                      <Shield className="mr-1 h-4 w-4" />
                      检察团成员
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">经验值</span>
                    <span className="font-semibold">
                      {userProfile.experience} / {experienceToNextLevel}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-500"
                      style={{ width: `${expProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-red-500 hover:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inspector Section */}
        {inspectorEligibility && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-6 w-6 text-green-500" />
                检察团资格
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isInspector ? (
                <div className="space-y-4">
                  <p className="text-green-600 font-semibold">
                    ✅ 您是检察团成员
                  </p>
                  <Button
                    onClick={() => navigate('/inspector')}
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    进入检察团工作台
                  </Button>
                </div>
              ) : inspectorEligibility.eligible ? (
                <div className="space-y-4">
                  <p className="text-green-600 font-semibold">
                    ✅ 您符合检察团加入条件
                  </p>
                  <p className="text-sm text-gray-600">
                    检察团成员可以审核求助帖子和商家申请，维护社区秩序
                  </p>
                  <Button
                    onClick={handleApplyInspector}
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    申请加入检察团
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600">
                    ❌ 暂不符合条件（需要等级≥{inspectorEligibility.required_level} 且 积分≥{inspectorEligibility.required_points}）
                  </p>
                  <p className="text-sm text-gray-500">
                    当前：等级 {userProfile.level}，积分 {userProfile.points}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Shop Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="mr-2 h-6 w-6" />
                我的店铺
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myShop ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={myShop.logo_url}
                      alt={myShop.shop_name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{myShop.shop_name}</h3>
                      <p className="text-sm text-gray-600">{myShop.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      className={
                        myShop.status === 'approved'
                          ? 'bg-green-500'
                          : myShop.status === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }
                    >
                      {myShop.status === 'approved'
                        ? '已通过'
                        : myShop.status === 'pending'
                        ? '审核中'
                        : '已拒绝'}
                    </Badge>
                    {myShop.status === 'approved' && (
                      <Button onClick={() => navigate('/seller')}>
                        进入商家中心
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Store className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">您还没有店铺</p>
                  <Button onClick={switchToSeller}>
                    <Store className="mr-2 h-4 w-4" />
                    开设店铺
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="mr-2 h-6 w-6" />
                我的订单
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myOrders.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-semibold">订单 #{order.id}</p>
                        <p className="text-sm text-gray-600">
                          {formatToShanghaiTime(order.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-pink-600">
                          ¥{order.total_amount}
                        </p>
                        <Badge
                          className={
                            order.status === 'paid' || order.status === 'completed'
                              ? 'bg-green-500'
                              : order.status === 'pending'
                              ? 'bg-yellow-500'
                              : 'bg-gray-500'
                          }
                        >
                          {order.status === 'paid'
                            ? '已支付'
                            : order.status === 'completed'
                            ? '已完成'
                            : order.status === 'pending'
                            ? '待支付'
                            : order.status === 'shipped'
                            ? '已发货'
                            : order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">暂无订单</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}