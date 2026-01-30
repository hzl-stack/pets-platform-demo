# 宠物平台开发计划

## 设计指南

### 设计参考
- **主要灵感**: Petfinder.com, Chewy.com
- **风格**: 现代简约 + 温馨可爱 + 宠物友好

### 色彩方案
- Primary: #FF6B9D (粉色 - 主要按钮和强调)
- Secondary: #4ECDC4 (青绿色 - 次要元素)
- Accent: #FFE66D (黄色 - 高亮和提示)
- Background: #FFFFFF (白色 - 背景)
- Surface: #F7F7F7 (浅灰 - 卡片背景)
- Text: #2C3E50 (深灰 - 主要文字)
- Text Secondary: #7F8C8D (中灰 - 次要文字)

### 字体
- Heading1: Plus Jakarta Sans font-weight 700 (42px)
- Heading2: Plus Jakarta Sans font-weight 600 (32px)
- Heading3: Plus Jakarta Sans font-weight 600 (24px)
- Body/Normal: Plus Jakarta Sans font-weight 400 (16px)
- Body/Emphasis: Plus Jakarta Sans font-weight 600 (16px)
- Navigation: Plus Jakarta Sans font-weight 600 (18px)

### 关键组件样式
- **按钮**: 圆角12px，主按钮粉色背景，悬停时加深10%
- **卡片**: 白色背景，1px边框 #E0E0E0，圆角16px，悬停时提升4px
- **表单**: 圆角8px，聚焦时青绿色边框
- **头像**: 圆形，边框2px粉色

### 布局与间距
- Hero区域: 全宽，带有宠物插图背景
- 内容网格: 3列桌面，2列平板，1列移动，间距20px
- 区域内边距: 60px垂直
- 卡片悬停: 提升4px，柔和阴影，200ms过渡

### 需要生成的图片
1. **hero-pets-banner.jpg** - 可爱的猫狗在一起的温馨场景，明亮背景 (Style: photorealistic, warm mood)
2. **social-feed-bg.jpg** - 宠物社交场景，多只宠物互动 (Style: photorealistic, playful)
3. **shop-banner.jpg** - 宠物用品展示，玩具和食品 (Style: photorealistic, clean)
4. **default-avatar.png** - 可爱的爪印图标作为默认头像 (Style: minimalist, icon)

---

## 数据库设计

### 用户表 (users)
- Atoms Cloud内置，无需创建

### 动态表 (posts)
```json
{
  "title": "posts",
  "type": "object",
  "properties": {
    "id": {"type": "integer", "description": "主键，自增"},
    "user_id": {"type": "string", "description": "用户ID"},
    "content": {"type": "string", "description": "动态内容"},
    "images": {"type": "string", "description": "图片URL列表，JSON字符串"},
    "is_anonymous": {"type": "boolean", "description": "是否匿名"},
    "likes_count": {"type": "integer", "description": "点赞数", "default": 0},
    "created_at": {"type": "string", "description": "创建时间"}
  },
  "required": ["id", "user_id", "content", "created_at"],
  "create_only": true
}
```

### 评论表 (comments)
```json
{
  "title": "comments",
  "type": "object",
  "properties": {
    "id": {"type": "integer", "description": "主键，自增"},
    "post_id": {"type": "integer", "description": "动态ID"},
    "user_id": {"type": "string", "description": "用户ID"},
    "content": {"type": "string", "description": "评论内容"},
    "created_at": {"type": "string", "description": "创建时间"}
  },
  "required": ["id", "post_id", "user_id", "content", "created_at"],
  "create_only": true
}
```

### 商品表 (products)
```json
{
  "title": "products",
  "type": "object",
  "properties": {
    "id": {"type": "integer", "description": "主键，自增"},
    "seller_id": {"type": "string", "description": "商家用户ID"},
    "name": {"type": "string", "description": "商品名称"},
    "description": {"type": "string", "description": "商品描述"},
    "price": {"type": "number", "description": "价格"},
    "category": {"type": "string", "description": "分类：食品/玩具/用品/医疗"},
    "image_url": {"type": "string", "description": "商品图片URL"},
    "stock": {"type": "integer", "description": "库存数量"},
    "status": {"type": "string", "description": "状态：active/inactive"},
    "created_at": {"type": "string", "description": "创建时间"}
  },
  "required": ["id", "seller_id", "name", "price", "category", "status", "created_at"],
  "create_only": true
}
```

### 购物车表 (cart_items)
```json
{
  "title": "cart_items",
  "type": "object",
  "properties": {
    "id": {"type": "integer", "description": "主键，自增"},
    "user_id": {"type": "string", "description": "用户ID"},
    "product_id": {"type": "integer", "description": "商品ID"},
    "quantity": {"type": "integer", "description": "数量"},
    "created_at": {"type": "string", "description": "创建时间"}
  },
  "required": ["id", "user_id", "product_id", "quantity", "created_at"],
  "create_only": true
}
```

---

## 开发任务

### 阶段1: 基础设置与数据库
1. 生成所需图片素材
2. 创建数据库表结构
3. 插入模拟数据

### 阶段2: 核心页面开发
4. 首页 - Hero区域、导航栏、功能入口
5. 用户认证 - 登录回调页面、个人资料页
6. 社交模块 - 动态列表、发布动态、评论功能
7. 商城模块 - 商品列表、商品详情、购物车
8. 商家后台 - 商品管理、上下架功能

### 阶段3: 组件与样式
9. 通用组件 - PostCard、ProductCard、Header、Footer
10. 响应式布局优化
11. 交互动画和过渡效果

### 阶段4: 测试与优化
12. Lint检查和构建测试
13. UI渲染检查
14. 最终优化