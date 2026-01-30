import { useEffect, useState } from 'react';
import { createClient } from '@metagptx/web-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
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
  seller_id: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '食品',
    image_url: 'https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/772b1972-4869-4caa-9ba3-fea5873bf463.png',
    stock: '',
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
      loadProducts();
    } catch (error) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.stock) {
      toast({
        title: '请填写所有必填字段',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingProduct) {
        await client.entities.products.update({
          id: editingProduct.id.toString(),
          data: {
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            image_url: formData.image_url,
            stock: parseInt(formData.stock),
          },
        });
        toast({
          title: '商品更新成功',
        });
      } else {
        await client.entities.products.create({
          data: {
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            image_url: formData.image_url,
            stock: parseInt(formData.stock),
            status: 'active',
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
        });
        toast({
          title: '商品创建成功',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      toast({
        title: '操作失败',
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
      image_url: product.image_url,
      stock: product.stock.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (product: Product) => {
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

  const handleDelete = async (productId: number) => {
    if (!confirm('确定要删除这个商品吗？')) return;

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

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '食品',
      image_url: 'https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/772b1972-4869-4caa-9ba3-fea5873bf463.png',
      stock: '',
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">商家中心</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="bg-pink-500 hover:bg-pink-600 text-white rounded-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                添加商品
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">商品描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">价格 *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">库存 *</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category">分类</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white">
                    {editingProduct ? '更新' : '创建'}
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
                <div className="flex items-center justify-between mb-2">
                  <Badge className={product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                    {product.status === 'active' ? '已上架' : '已下架'}
                  </Badge>
                  <Badge className="bg-cyan-500">{product.category}</Badge>
                </div>
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-pink-500">¥{product.price}</span>
                  <span className="text-sm text-gray-500">库存: {product.stock}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(product)}
                  className="flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(product)}
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
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}