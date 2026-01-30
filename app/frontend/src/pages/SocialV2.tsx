import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Send, UserCircle, LogIn, HelpCircle, MessageSquare, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatToShanghaiTime, getCurrentShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

interface Post {
  id: number;
  user_id: string;
  content: string;
  post_type: 'daily' | 'help';
  is_anonymous: boolean;
  review_status: 'pending' | 'approved' | 'rejected';
  reward_points: number;
  is_solved: boolean;
  solver_id: string;
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

interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string;
  level: number;
}

export default function SocialV2() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'daily' | 'help'>('daily');
  const [rewardPoints, setRewardPoints] = useState(10);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'daily' | 'help'>('daily');
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadPosts();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      await loadUserProfile();
    } catch (error) {
      setUser(null);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/user_system/profile',
        method: 'GET',
      });
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await client.entities.posts_v2.queryAll({
        query: { 
          post_type: activeTab,
          review_status: 'approved'
        },
        sort: '-created_at',
        limit: user ? 100 : 10, // Guests can only see 10 posts
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

    if (postType === 'help' && rewardPoints < 5) {
      toast({
        title: '悬赏积分不能少于5',
        variant: 'destructive',
      });
      return;
    }

    try {
      const postData = {
        content: newPost,
        post_type: postType,
        is_anonymous: isAnonymous,
        review_status: postType === 'daily' ? 'approved' : 'pending',
        reward_points: postType === 'help' ? rewardPoints : 0,
        is_solved: false,
        likes_count: 0,
        comments_count: 0,
        created_at: getCurrentShanghaiTime(),
      };

      await client.entities.posts_v2.create({
        data: postData,
      });

      // Award experience for posting
      await client.apiCall.invoke({
        url: '/api/v1/user_system/experience',
        method: 'POST',
        data: {
          action_type: postType === 'daily' ? 'post_daily' : 'post_help',
        },
      });

      setNewPost('');
      setIsAnonymous(false);
      setRewardPoints(10);
      
      if (postType === 'daily') {
        toast({
          title: '发布成功',
          description: '获得 5 经验值',
        });
        loadPosts();
      } else {
        toast({
          title: '提交成功',
          description: '求助帖需要审核，审核通过后将显示。获得 5 经验值',
        });
      }
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
      await client.entities.posts_v2.update({
        id: postId.toString(),
        data: {
          likes_count: currentLikes + 1,
        },
      });

      // Award experience for liking
      await client.apiCall.invoke({
        url: '/api/v1/user_system/experience',
        method: 'POST',
        data: {
          action_type: 'like',
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
        await client.entities.posts_v2.update({
          id: postId.toString(),
          data: {
            comments_count: post.comments_count + 1,
          },
        });
      }

      // Award experience for commenting
      await client.apiCall.invoke({
        url: '/api/v1/user_system/experience',
        method: 'POST',
        data: {
          action_type: 'comment',
        },
      });

      setNewComment('');
      loadComments(postId);
      loadPosts();
      toast({
        title: '评论成功',
        description: '获得 2 经验值',
      });
    } catch (error: any) {
      toast({
        title: '评论失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const markAsSolved = async (postId: number, solverId: string) => {
    if (!user) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post || post.user_id !== user.id) {
        toast({
          title: '无权操作',
          description: '只有帖子作者可以标记为已解决',
          variant: 'destructive',
        });
        return;
      }

      await client.entities.posts_v2.update({
        id: postId.toString(),
        data: {
          is_solved: true,
          solver_id: solverId,
        },
      });

      toast({
        title: '已标记为解决',
      });

      loadPosts();
    } catch (error: any) {
      toast({
        title: '操作失败',
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
                    您当前以游客身份浏览（仅显示前10条），登录后可发布动态、点赞和评论
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

        {/* User Level Display */}
        {user && userProfile && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={userProfile.avatar_url}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{userProfile.username}</p>
                    <Badge className="bg-gradient-to-r from-pink-500 to-purple-600">
                      等级 {userProfile.level}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Post Card - Only show for logged in users */}
        {user && (
          <Card className="mb-8">
            <CardHeader>
              <Tabs value={postType} onValueChange={(v) => setPostType(v as 'daily' | 'help')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="daily">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    日常交流
                  </TabsTrigger>
                  <TabsTrigger value="help">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    求助帖
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={postType === 'daily' ? '分享你的宠物故事...' : '描述你遇到的问题...'}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[120px] mb-4"
              />
              
              {postType === 'help' && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">悬赏积分（最少5分）</label>
                  <Input
                    type="number"
                    min={5}
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(parseInt(e.target.value) || 5)}
                    className="w-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    解决问题者将获得悬赏积分和额外经验
                  </p>
                </div>
              )}

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
                  {postType === 'daily' ? '发布' : '提交求助'}
                </Button>
              </div>
              
              {postType === 'help' && (
                <p className="text-xs text-gray-500 mt-2">
                  求助帖需要审核，审核通过后才会显示
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Posts Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'daily' | 'help')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">
              <MessageSquare className="mr-2 h-4 w-4" />
              日常交流
            </TabsTrigger>
            <TabsTrigger value="help">
              <HelpCircle className="mr-2 h-4 w-4" />
              求助专区
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
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
                  </div>
                  <div className="flex items-center space-x-2">
                    {post.post_type === 'help' && (
                      <>
                        {post.is_solved ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            已解决
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500">
                            <HelpCircle className="mr-1 h-3 w-3" />
                            悬赏 {post.reward_points}
                          </Badge>
                        )}
                      </>
                    )}
                    {post.is_anonymous && (
                      <Badge variant="secondary">匿名</Badge>
                    )}
                  </div>
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
              <p className="text-gray-600 text-lg">
                {activeTab === 'daily' ? '还没有动态，快来发布第一条吧！' : '暂无求助帖'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}