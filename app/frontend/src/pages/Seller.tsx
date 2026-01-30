import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const client = createClient();

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  status: string;
  created_at: string;
}

interface Shop {
  id: number;
  shop_name: string;
}

export default function Seller() {
  const [user, setUser] = useState<any>(null);
  const [myShop, setMyShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
    category: '食品',
    stock: '0',
    image_url: 'https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/772b1972-4869-4caa-9ba3-fea5873bf463.png',
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
      await loadShopData();
    } catch (error) {
      navigate('/');
    }
  };

  const loadShopData = async () => {
    try {
      // Check if user has a shop
      const shopResponse = await client.entities.shops.query({});
      if (shopResponse.data.items && shopResponse.data.items.length > 0) {
        setMyShop(shopResponse.data.items[0]);
        loadProducts();
      } else {
        toast({
          title: '您还没有店铺',
          description: '请先创建店铺',
        });
        navigate('/seller/register');
      }
    } catch (error) {
      console.error('Failed to load shop data:', error);
    }
  };

  const loadProducts = async () => {
    try {
      // Load all products (simplified version without shop_id filter)
      const response = await client.entities.products.query({
        sort: '-created_at',
      });
      setProducts(response.data.items || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: '请输入商品名称',
        variant: 'destructive',
      });
      return;
    }

    try {
      const productData = {
        name: formData.name,
        description: formData.description || '暂无描述',
        price: 0, // Test version: all products are 0 yuan
        category: formData.category,
        image_url: formData.image_url,
        stock: parseInt(formData.stock) || 0,
        status: 'active',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };

      if (editingProduct) {
        await client.entities.products.update({
          id: editingProduct.id.toString(),
          data: productData,
        });
        toast({
          title: '商品更新成功',
        });
      } else {
        await client.entities.products.create({
          data: productData,
        });
        toast({
          title: '商品添加成功',
        });
      }

      setIsAddDialogOpen(false);
      setEditingProduct(null);
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
      price: product.price.toString(),
      category: product.category,
      stock: product.stock.toString(),
      image_url: product.image_url,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('确定要删除这个商品吗？')) {
      return;
    }

    try {
      await client.entities.products.delete({ id: productId.toString() });
      toast({
        title: '商品已删除',
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
      await client.entities.products.update({
        id: product.id.toString(),
        data: {
          status: product.status === 'active' ? 'inactive' : 'active',
        },
      });
      toast({
        title: product.status === 'active' ? '商品已下架' : '商品已上架',
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
      price: '0',
      category: '食品',
      stock: '0',
      image_url: 'https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/772b1972-4869-4caa-9ba3-fea5873bf463.png',
    });
  };

  if (!user || !myShop) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">商家中心</h1>
            <p className="text-gray-600 mt-2">店铺：{myShop.shop_name}</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  resetForm();
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                添加商品
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? '编辑商品' : '添加商品'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">商品名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入商品名称"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">商品描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入商品描述"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">分类</Label>
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
                    <Label htmlFor="stock">库存数量</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>提示：</strong>当前为测试版，所有商品价格统一为0元
                  </p>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-full"
                  >
                    {editingProduct ? '更新商品' : '添加商品'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="flex-1 rounded-full"
                  >
                    取消
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <Badge className={product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                    {product.status === 'active' ? '上架' : '下架'}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{product.description}</p>
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
                    {product.status === 'active' ? '下架' : '上架'}
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

        {products.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-gray-600 text-lg mb-4">还没有商品</p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                添加第一个商品
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}