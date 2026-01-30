import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ShoppingBag, Heart } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative h-[500px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/e9cb48e2-fc0d-4bfc-8603-571a0480a0b7.png)',
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">欢迎来到宠物乐园</h1>
          <p className="text-xl md:text-2xl mb-8">分享快乐，连接爱宠</p>
          <Button
            size="lg"
            className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-8 py-6 text-lg"
            onClick={() => navigate('/social')}
          >
            立即加入
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">平台特色</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate('/social')}
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">社交交流</h3>
              <p className="text-gray-600">
                分享你的宠物日常，与其他宠物主人交流心得，支持匿名发布保护隐私
              </p>
            </div>

            <div
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate('/shop')}
            >
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-cyan-500" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">宠物商城</h3>
              <p className="text-gray-600">
                精选优质宠物用品，食品、玩具、医疗用品应有尽有，为爱宠提供最好的
              </p>
            </div>

            <div
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate('/seller')}
            >
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">商家入驻</h3>
              <p className="text-gray-600">
                商家可以轻松上架商品，管理库存，为宠物主人提供优质产品和服务
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-pink-500 to-cyan-500">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">准备好加入我们了吗？</h2>
          <p className="text-xl mb-8">让我们一起为宠物创造更美好的生活</p>
          <Button
            size="lg"
            className="bg-white text-pink-500 hover:bg-gray-100 rounded-full px-8 py-6 text-lg"
            onClick={() => navigate('/social')}
          >
            开始探索
          </Button>
        </div>
      </section>
    </div>
  );
}