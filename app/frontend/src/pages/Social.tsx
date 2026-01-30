import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const client = createClient();

interface Post {
  id: number;
  user_id: string;
  content: string;
  images: string;
  is_anonymous: boolean;
  likes_count: number;
  created_at: string;
}

export default function Social() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      loadPosts();
    } catch (error) {
      setUser(null);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await client.entities.posts.queryAll({
        sort: '-created_at',
        limit: 50,
      });
      setPosts(response.data.items || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const handleLogin = async () => {
    await client.auth.toLogin();
  };

  const handleCreatePost = async () => {
    if (!newContent.trim()) {
      toast({
        title: '内容不能为空',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await client.entities.posts.create({
        data: {
          content: newContent,
          images: '[]',
          is_anonymous: isAnonymous,
          likes_count: 0,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
      });

      toast({
        title: '发布成功',
      });

      setNewContent('');
      setIsAnonymous(false);
      loadPosts();
    } catch (error: any) {
      toast({
        title: '发布失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: number, currentLikes: number) => {
    if (!user) {
      toast({
        title: '请先登录',
        variant: 'destructive',
      });
      return;
    }

    try {
      await client.entities.posts.update({
        id: postId.toString(),
        data: {
          likes_count: currentLikes + 1,
        },
      });
      loadPosts();
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-2xl font-bold text-center">加入宠物社区</h2>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">登录后即可发布动态，与其他宠物主人交流</p>
            <Button onClick={handleLogin} className="bg-pink-500 hover:bg-pink-600 text-white rounded-full w-full">
              立即登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">宠物社区</h1>

        {/* Create Post */}
        <Card className="mb-8">
          <CardHeader>
            <h3 className="text-xl font-semibold">分享你的宠物日常</h3>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="说点什么吧..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[120px] mb-4"
            />
            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous">匿名发布</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleCreatePost}
              disabled={loading}
              className="bg-pink-500 hover:bg-pink-600 text-white rounded-full ml-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              发布
            </Button>
          </CardFooter>
        </Card>

        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar className="border-2 border-pink-500">
                    <AvatarImage src="https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/07fdc374-fdcb-4339-895f-65959cfa2061.png" />
                    <AvatarFallback>🐾</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {post.is_anonymous ? '匿名用户' : '宠物主人'}
                    </p>
                    <p className="text-sm text-gray-500">{post.created_at}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
              </CardContent>
              <CardFooter className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id, post.likes_count)}
                  className="text-pink-500 hover:text-pink-600"
                >
                  <Heart className="mr-2 h-4 w-4" />
                  {post.likes_count}
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  评论
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}