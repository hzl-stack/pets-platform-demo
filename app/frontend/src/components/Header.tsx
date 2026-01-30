import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createClient } from '@metagptx/web-sdk';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShoppingCart, User, LogOut, Store } from 'lucide-react';

const client = createClient();

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    if (user) {
      loadCartCount();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.auth.me();
      setUser(response.data);
      loadCartCount();
    } catch (error) {
      setUser(null);
    }
  };

  const loadCartCount = async () => {
    try {
      const response = await client.entities.cart_items.query({});
      setCartCount(response.data.items?.length || 0);
    } catch (error) {
      console.error('Failed to load cart count:', error);
    }
  };

  const handleLogin = async () => {
    await client.auth.toLogin();
  };

  const handleLogout = async () => {
    await client.auth.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🐾</span>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
              宠物乐园
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-pink-500 transition-colors font-semibold">
              首页
            </Link>
            <Link to="/social" className="text-gray-700 hover:text-pink-500 transition-colors font-semibold">
              社区
            </Link>
            <Link to="/shop" className="text-gray-700 hover:text-pink-500 transition-colors font-semibold">
              商城
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('/cart')}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8 border-2 border-pink-500">
                        <AvatarImage src="https://mgx-backend-cdn.metadl.com/generate/images/940135/2026-01-30/07fdc374-fdcb-4339-895f-65959cfa2061.png" />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      个人中心
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/seller')}>
                      <Store className="mr-2 h-4 w-4" />
                      商家中心
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={handleLogin} className="bg-pink-500 hover:bg-pink-600 text-white rounded-full">
                登录
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}