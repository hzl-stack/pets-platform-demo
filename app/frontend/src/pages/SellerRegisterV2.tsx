import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Store, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getCurrentShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

export default function SellerRegisterV2() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existingShop, setExistingShop] = useState<any>(null);
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      
      // Check if user already has a shop (using shops_v2)
      const shopResponse = await client.entities.shops_v2.query({});
      if (shopResponse.data.items && shopResponse.data.items.length > 0) {
        setExistingShop(shopResponse.data.items[0]);
      }
      
      setLoading(false);
    } catch (error) {
      toast({
        title: '请先登录',
        description: '您需要登录才能开店',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    if (!shopName || !description) {
      toast({
        title: '请填写完整信息',
        variant: 'destructive',
      });
      return;
    }

    try {
      await client.entities.shops_v2.create({
        data: {
          shop_name: shopName,
          description,
          logo_url: '/images/photo1769781679.jpg',
          status: 'pending',
          average_rating: 0,
          created_at: getCurrentShanghaiTime(),
        },
      });

      toast({
        title: '提交成功',
        description: '您的店铺申请已提交，请等待审核',
      });

      // Reload to show pending status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: '提交失败',
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

  if (!user) {
    return null;
  }

  // Show existing shop status
  if (existingShop) {
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'pending':
          return {
            icon: <Clock className="h-8 w-8 text-yellow-500" />,
            badge: <Badge className="bg-yellow-500">审核中</Badge>,
            title: '店铺审核中',
            description: '您的店铺申请正在审核中，请耐心等待',
          };
        case 'approved':
          return {
            icon: <CheckCircle className="h-8 w-8 text-green-500" />,
            badge: <Badge className="bg-green-500">已通过</Badge>,
            title: '审核通过',
            description: '恭喜！您的店铺已通过审核',
          };
        case 'rejected':
          return {
            icon: <XCircle className="h-8 w-8 text-red-500" />,
            badge: <Badge className="bg-red-500">已拒绝</Badge>,
            title: '审核未通过',
            description: '很抱歉，您的店铺申请未通过审核',
          };
        default:
          return {
            icon: <Store className="h-8 w-8 text-gray-500" />,
            badge: <Badge className="bg-gray-500">未知状态</Badge>,
            title: '店铺状态',
            description: '店铺状态未知',
          };
      }
    };

    const statusInfo = getStatusInfo(existingShop.status);

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    {statusInfo.icon}
                  </div>
                  <div>
                    <CardTitle className="text-3xl">{statusInfo.title}</CardTitle>
                    <p className="text-gray-600 mt-1">{statusInfo.description}</p>
                  </div>
                </div>
                {statusInfo.badge}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">店铺信息</h3>
                <p className="text-sm text-gray-600">店铺名称：{existingShop.shop_name}</p>
                <p className="text-sm text-gray-600 mt-1">店铺简介：{existingShop.description}</p>
              </div>

              {existingShop.status === 'approved' && (
                <Button
                  onClick={() => navigate('/seller')}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-full py-6 text-lg"
                >
                  <Store className="mr-2 h-5 w-5" />
                  进入商家中心
                </Button>
              )}

              {existingShop.status === 'rejected' && (
                <p className="text-sm text-gray-500 text-center">
                  如有疑问，请联系客服
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show registration form
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <Store className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl">开设店铺</CardTitle>
                <p className="text-gray-600 mt-1">填写店铺信息，提交审核</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">店铺名称</label>
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="输入店铺名称"
                className="text-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">店铺简介</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="介绍一下您的店铺..."
                className="min-h-[150px]"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>提示：</strong>店铺申请需要检察团审核，审核通过后才能上架商品。
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-full py-6 text-lg"
            >
              <Store className="mr-2 h-5 w-5" />
              提交审核
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}