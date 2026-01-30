import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getCurrentShanghaiTime } from '@/utils/dateFormatter';

const client = createClient();

interface Product {
  id: number;
  shop_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  status: string;
  created_at: string;
}

export default function Seller() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '食品',
    stock: 100,
    image_url: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const categories = ['食品', '玩具', '用品', '医疗'];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      
      // Check if user has a shop
      const shopResponse = await client.entities.shops.query({});
      if (!shopResponse.data.items || shopResponse.data.items.length === 0) {
        toast({
          title: '请先开店',
          description: '您需要先创建店铺才能管理商品',
          variant: 'destructive',
        });
        navigate('/seller/register');
        return;
      }
      
      await loadProducts();
      setLoading(false);
    } catch (error) {
      toast({
        title: '请先登录',
        description: '您需要登录才能访问商家中心',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await client.entities.products.query({
        sort: '-created_at',
      });
      setProducts(response.data.items || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      toast({
        title: '请填写完整信息',
        variant: 'destructive',
      });
      return;
    }

    try {
      const productData = {
        ...formData,
        price: 0,
        status: 'active',
        shop_id: 1,
        created_at: getCurrentShanghaiTime(),
      };

      if (editingProduct) {
        await client.entities.products.update({
          id: editingProduct.id.toString(),
          data: productData,
        });
        toast({
          title: '更新成功',
        });
      } else {
        await client.entities.products.create({
          data: productData,
        });
        toast({
          title: '添加成功',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      toast({
        title: editingProduct ? '更新失败' : '添加失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      stock: product.stock,
      image_url: product.image_url,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('确定要删除这个商品吗？')) return;

    try {
      await client.entities.products.delete({ id: productId.toString() });
      toast({
        title: '删除成功',
      });
      loadProducts();
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      await client.entities.products.update({
        id: product.id.toString(),
        data: { status: newStatus },
      });
      toast({
        title: newStatus === 'active' ? '已上架' : '已下架',
      });
      loadProducts();
    } catch (error: any) {
      toast({
        title: '操作失败',
        description: error?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '食品',
      stock: 100,
      image_url: '',
    });
    setEditingProduct(null);
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            商家中心
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                添加商品
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProduct ? '编辑商品' : '添加商品'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">商品名称</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入商品名称"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">商品描述</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="输入商品描述"
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">分类</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">库存</label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                    }
                    placeholder="输入库存数量"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">图片URL</label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                    placeholder="输入图片URL"
                  />
                </div>
                <p className="text-sm text-gray-500">测试版：所有商品价格统一为0元</p>
                <Button onClick={handleSubmit} className="w-full">
                  {editingProduct ? '更新商品' : '添加商品'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-gray-600 text-lg">还没有商品，快来添加第一个商品吧！</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                    <Badge className={product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                      {product.status === 'active' ? '已上架' : '已下架'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-cyan-500">{product.category}</Badge>
                    <span className="text-sm text-gray-500">库存: {product.stock}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(product)}
                      className="flex-1"
                    >
                      {product.status === 'active' ? (
                        <>
                          <EyeOff className="mr-1 h-3 w-3" />
                          下架
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-3 w-3" />
                          上架
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}