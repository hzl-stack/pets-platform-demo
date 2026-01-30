import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Send, UserCircle, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatToShanghaiTime, getCurrentShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

interface Post {
  id: number;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
}

export default function Social() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadPosts();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await client.entities.posts.queryAll({
        sort: '-created_at',
      });
      setPosts(response.data.items || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const requireLogin = (action: string) => {
    toast({
      title: '请先登录',
      description: `您需要登录才能${action}`,
      variant: 'destructive',
    });
  };

  const handleCreatePost = async () => {
    if (!user) {
      requireLogin('发布动态');
      return;
    }

    if (!newPost.trim()) {
      toast({
        title: '请输入内容',
        variant: 'destructive',
      });
      return;
    }

    try {
      await client.entities.posts.create({
        data: {
          content: newPost,
          is_anonymous: isAnonymous,
          likes_count: 0,
          comments_count: 0,
          created_at: getCurrentShanghaiTime(),
        },
      });

      setNewPost('');
      setIsAnonymous(false);
      toast({
        title: '发布成功',
      });
      loadPosts();
    } catch (error: any) {
      toast({
        title: '发布失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleLike = async (postId: number, currentLikes: number) => {
    if (!user) {
      requireLogin('点赞');
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
    } catch (error: any) {
      toast({
        title: '点赞失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const loadComments = async (postId: number) => {
    try {
      const response = await client.entities.comments.queryAll({
        query: { post_id: postId },
        sort: '-created_at',
      });
      setComments(response.data.items || []);
      setSelectedPost(postId);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleComment = async (postId: number) => {
    if (!user) {
      requireLogin('评论');
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: '请输入评论内容',
        variant: 'destructive',
      });
      return;
    }

    try {
      await client.entities.comments.create({
        data: {
          post_id: postId,
          content: newComment,
          created_at: getCurrentShanghaiTime(),
        },
      });

      // Update comments count
      const post = posts.find((p) => p.id === postId);
      if (post) {
        await client.entities.posts.update({
          id: postId.toString(),
          data: {
            comments_count: post.comments_count + 1,
          },
        });
      }

      setNewComment('');
      loadComments(postId);
      loadPosts();
      toast({
        title: '评论成功',
      });
    } catch (error: any) {
      toast({
        title: '评论失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          宠物社交
        </h1>

        {/* Guest Notice */}
        {!user && (
          <Card className="mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <LogIn className="h-5 w-5 text-pink-500" />
                  <p className="text-sm text-gray-700">
                    您当前以游客身份浏览，登录后可发布动态、点赞和评论
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

        {/* Create Post Card - Only show for logged in users */}
        {user && (
          <Card className="mb-8">
            <CardHeader>
              <h3 className="text-lg font-semibold">分享你的宠物故事</h3>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="说说你的想法..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[120px] mb-4"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">匿名发布</span>
                </label>
                <Button
                  onClick={handleCreatePost}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  发布
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      <UserCircle className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {post.is_anonymous ? '匿名用户' : '宠物爱好者'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatToShanghaiTime(post.created_at)}
                    </p>
                  </div>
                  {post.is_anonymous && (
                    <Badge variant="secondary" className="ml-auto">
                      匿名
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id, post.likes_count)}
                  className="text-pink-500 hover:text-pink-600"
                  disabled={!user}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  {post.likes_count}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadComments(post.id)}
                  className="text-purple-500 hover:text-purple-600"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {post.comments_count}
                </Button>
              </CardFooter>

              {/* Comments Section */}
              {selectedPost === post.id && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="space-y-3 mb-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-white p-3 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <UserCircle className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">宠物爱好者</p>
                            <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatToShanghaiTime(comment.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {user ? (
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="写下你的评论..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <Button
                        onClick={() => handleComment(post.id)}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">登录后可以发表评论</p>
                      <Button
                        onClick={() => client.auth.toLogin()}
                        size="sm"
                        className="mt-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full"
                      >
                        登录
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-gray-600 text-lg">还没有动态，快来发布第一条吧！</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}