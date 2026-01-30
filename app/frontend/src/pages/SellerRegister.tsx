import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getCurrentShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

export default function SellerRegister() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
      
      // Check if user already has a shop
      const shopResponse = await client.entities.shops.query({});
      if (shopResponse.data.items && shopResponse.data.items.length > 0) {
        toast({
          title: '您已经有店铺了',
          description: '跳转到商家中心',
        });
        navigate('/seller');
        return;
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
      await client.entities.shops.create({
        data: {
          shop_name: shopName,
          description,
          logo_url: '/images/Shop.jpg',
          status: 'active',
          created_at: getCurrentShanghaiTime(),
        },
      });

      toast({
        title: '开店成功',
        description: '欢迎成为商家！',
      });

      navigate('/seller');
    } catch (error: any) {
      toast({
        title: '开店失败',
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
                <p className="text-gray-600 mt-1">填写店铺信息，开启您的销售之旅</p>
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
            <Button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-full py-6 text-lg"
            >
              <Store className="mr-2 h-5 w-5" />
              创建店铺
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}