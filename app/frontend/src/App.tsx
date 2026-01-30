import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import Home from '@/pages/Home';
import Social from '@/pages/Social';
import Shop from '@/pages/Shop';
import Cart from '@/pages/Cart';
import Seller from '@/pages/Seller';
import AuthCallback from '@/pages/AuthCallback';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/*"
            element={
              <>
                <Header />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/social" element={<Social />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/seller" element={<Seller />} />
                </Routes>
              </>
            }
          />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;