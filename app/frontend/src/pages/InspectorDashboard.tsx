import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Shield, FileText, Store, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatToShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

interface PendingPost {
  id: number;
  content: string;
  reward_points: number;
  created_at: string;
}

interface PendingShop {
  id: number;
  shop_name: string;
  description: string;
  logo_url: string;
  user_id: string;
  created_at: string;
}

export default function InspectorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isInspector, setIsInspector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [pendingShops, setPendingShops] = useState<PendingShop[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewType, setReviewType] = useState<'approve' | 'reject'>('approve');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      await checkInspectorStatus();
    } catch (error) {
      toast({
        title: '请先登录',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const checkInspectorStatus = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/inspectors/me',
        method: 'GET',
      });

      if (!response.data.is_inspector) {
        toast({
          title: '权限不足',
          description: '您不是检察团成员',
          variant: 'destructive',
        });
        navigate('/profile');
        return;
      }

      setIsInspector(true);
      await loadTasks();
      setLoading(false);
    } catch (error: any) {
      toast({
        title: '检查权限失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
      navigate('/profile');
    }
  };

  const loadTasks = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/inspectors/tasks',
        method: 'GET',
      });

      setPendingPosts(response.data.posts || []);
      setPendingShops(response.data.shops || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const openReviewDialog = (item: any, type: 'approve' | 'reject', itemType: 'post' | 'shop') => {
    setSelectedItem({ ...item, itemType });
    setReviewType(type);
    setReviewComment('');
    setIsReviewDialogOpen(true);
  };

  const handleReview = async () => {
    if (!selectedItem) return;

    try {
      if (selectedItem.itemType === 'shop') {
        await client.apiCall.invoke({
          url: `/api/v1/shop-reviews/${selectedItem.id}/${reviewType}`,
          method: 'POST',
          data: { review_comment: reviewComment },
        });
      } else {
        // Post review logic (to be implemented)
        toast({
          title: '帖子审核功能开发中',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: reviewType === 'approve' ? '审核通过' : '已拒绝',
      });

      setIsReviewDialogOpen(false);
      loadTasks();
    } catch (error: any) {
      toast({
        title: '操作失败',
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">
              检察团工作台
            </h1>
            <p className="text-gray-600">审核帖子和商家申请</p>
          </div>
        </div>

        <Tabs defaultValue="shops" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shops">
              <Store className="mr-2 h-4 w-4" />
              商家审核 ({pendingShops.length})
            </TabsTrigger>
            <TabsTrigger value="posts">
              <FileText className="mr-2 h-4 w-4" />
              帖子审核 ({pendingPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shops" className="mt-6">
            {pendingShops.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Store className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-lg">暂无待审核商家</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {pendingShops.map((shop) => (
                  <Card key={shop.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={shop.logo_url}
                            alt={shop.shop_name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <CardTitle>{shop.shop_name}</CardTitle>
                            <p className="text-sm text-gray-500">
                              {formatToShanghaiTime(shop.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-500">待审核</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{shop.description}</p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => openReviewDialog(shop, 'approve', 'shop')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          通过
                        </Button>
                        <Button
                          onClick={() => openReviewDialog(shop, 'reject', 'shop')}
                          variant="outline"
                          className="flex-1 text-red-500 hover:text-red-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          拒绝
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            {pendingPosts.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-lg">暂无待审核帖子</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingPosts.map((post) => (
                  <Card key={post.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            {formatToShanghaiTime(post.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-orange-500">
                            悬赏 {post.reward_points}
                          </Badge>
                          <Badge className="bg-yellow-500">待审核</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => openReviewDialog(post, 'approve', 'post')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          通过
                        </Button>
                        <Button
                          onClick={() => openReviewDialog(post, 'reject', 'post')}
                          variant="outline"
                          className="flex-1 text-red-500 hover:text-red-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          拒绝
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewType === 'approve' ? '审核通过' : '拒绝申请'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">审核意见</label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={reviewType === 'approve' ? '可选：填写通过理由' : '请说明拒绝原因'}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleReview}
                  className={`flex-1 ${
                    reviewType === 'approve'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  } text-white`}
                >
                  确认{reviewType === 'approve' ? '通过' : '拒绝'}
                </Button>
                <Button
                  onClick={() => setIsReviewDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}