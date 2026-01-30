import { useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Store } from 'lucide-react';

const client = createClient();

export default function SellerRegister() {
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopName.trim()) {
      toast({
        title: '请输入店铺名称',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await client.entities.shops.create({
        data: {
          shop_name: shopName,
          description: description || '暂无描述',
          logo_url: 'https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/07fdc374-fdcb-4339-895f-65959cfa2061.png',
          status: 'active',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
      });

      toast({
        title: '店铺创建成功！',
      });

      navigate('/profile');
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Store className="mr-3 h-6 w-6 text-purple-500" />
              开设店铺
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="shopName">店铺名称 *</Label>
                <Input
                  id="shopName"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="请输入店铺名称"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">店铺简介</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="介绍一下您的店铺..."
                  className="mt-2 min-h-[120px]"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>提示：</strong>创建店铺后，您将可以添加和管理商品。当前为测试版，所有商品价格为0元。
                </p>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-full"
                >
                  {loading ? '创建中...' : '创建店铺'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/profile')}
                  className="flex-1 rounded-full"
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}