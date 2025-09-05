import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Users, 
  Home, 
  Calendar, 
  BarChart3,
  Search,
  Shield,
  Settings,
  Folder,
  Check,
  Phone,
  Baby,
  List,
  Activity,
  MessageSquare,
  Book,
  Bell,
  ChevronRight,
  TrendingUp,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw
} from 'lucide-react';

const ROLES = {
  admin: { 
    name: '管理员', 
    icon: '👨‍💼', 
    color: 'purple',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  socialWorker: { 
    name: '社工', 
    icon: '👩‍💼', 
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  volunteer: { 
    name: '志愿者', 
    icon: '👦', 
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  parent: { 
    name: '家长', 
    icon: '👨‍👩‍👧‍👦', 
    color: 'pink',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200'
  }
};

const QUICK_ACTIONS = {
  admin: [
    { id: 'globalSearch', title: '全局搜索', desc: '跨角色查询', icon: Search, color: 'text-purple-600' },
    { id: 'permissions', title: '权限审批', desc: '3个待处理', icon: Shield, color: 'text-purple-600' },
    { id: 'systemStats', title: '系统统计', desc: '实时监控', icon: BarChart3, color: 'text-purple-600' },
    { id: 'settings', title: '系统设置', desc: '配置管理', icon: Settings, color: 'text-purple-600' }
  ],
  socialWorker: [
    { id: 'patientFiles', title: '档案管理', desc: '新建+编辑', icon: Folder, color: 'text-blue-600' },
    { id: 'serviceReview', title: '服务审核', desc: '2个待审核', icon: Check, color: 'text-blue-600' },
    { id: 'activityManage', title: '活动组织', desc: '创建+管理', icon: Calendar, color: 'text-blue-600' },
    { id: 'familyContact', title: '家属联系', desc: '紧急联系人', icon: Phone, color: 'text-blue-600' }
  ],
  volunteer: [
    { id: 'serviceRecord', title: '服务记录', desc: '快速填写', icon: Heart, color: 'text-orange-600' },
    { id: 'patientView', title: '档案查看', desc: '脱敏显示', icon: Users, color: 'text-orange-600' },
    { id: 'myActivities', title: '我的活动', desc: '已报名3个', icon: Calendar, color: 'text-orange-600' },
    { id: 'serviceGuide', title: '服务指南', desc: '操作手册', icon: Book, color: 'text-orange-600' }
  ],
  parent: [
    { id: 'myChild', title: '我的孩子', desc: '李小明', icon: Baby, color: 'text-pink-600' },
    { id: 'serviceProgress', title: '服务记录', desc: '查看进展', icon: List, color: 'text-pink-600' },
    { id: 'familyActivities', title: '亲子活动', desc: '可参与3个', icon: Activity, color: 'text-pink-600' },
    { id: 'community', title: '互助社区', desc: '经验分享', icon: MessageSquare, color: 'text-pink-600' }
  ]
};

const STATS_DATA = {
  admin: [
    { label: '系统状态', value: '正常', icon: CheckCircle, color: 'text-green-600', change: null },
    { label: '在线用户', value: '12人', icon: Users, color: 'text-blue-600', change: '+2' },
    { label: '待处理事项', value: '5个', icon: AlertCircle, color: 'text-orange-600', change: '-1' },
    { label: '数据同步', value: '2分钟前', icon: RefreshCw, color: 'text-gray-600', change: null }
  ],
  socialWorker: [
    { label: '今日工作量', value: '8/15', icon: TrendingUp, color: 'text-blue-600', change: null },
    { label: '待审核', value: '2个', icon: Clock, color: 'text-orange-600', change: '-1' },
    { label: '本月档案', value: '23个', icon: Folder, color: 'text-green-600', change: '+8' },
    { label: '活动组织', value: '3个', icon: Calendar, color: 'text-purple-600', change: '+1' }
  ],
  volunteer: [
    { label: '本月服务', value: '12次', icon: Heart, color: 'text-red-600', change: '+3' },
    { label: '下次活动', value: '周三', icon: Calendar, color: 'text-blue-600', change: null },
    { label: '服务时长', value: '24小时', icon: Clock, color: 'text-green-600', change: '+4h' },
    { label: '志愿评分', value: '4.9分', icon: Star, color: 'text-yellow-600', change: '+0.1' }
  ],
  parent: [
    { label: '关注患者', value: '1人', icon: Baby, color: 'text-pink-600', change: null },
    { label: '最新服务', value: '2小时前', icon: Clock, color: 'text-gray-600', change: null },
    { label: '参与活动', value: '5次', icon: Activity, color: 'text-blue-600', change: '+1' },
    { label: '社区积分', value: '156分', icon: Star, color: 'text-yellow-600', change: '+12' }
  ]
};

const RECENT_ACTIVITIES = [
  { 
    id: 1, 
    title: '李小明完成康复训练', 
    time: '2小时前', 
    type: 'service', 
    icon: Heart,
    color: 'text-red-600'
  },
  { 
    id: 2, 
    title: '周末亲子活动报名开始', 
    time: '4小时前', 
    type: 'activity', 
    icon: Calendar,
    color: 'text-blue-600'
  },
  { 
    id: 3, 
    title: '新档案审核通过', 
    time: '6小时前', 
    type: 'approval', 
    icon: CheckCircle,
    color: 'text-green-600'
  },
  { 
    id: 4, 
    title: '月度统计报告生成', 
    time: '1天前', 
    type: 'report', 
    icon: BarChart3,
    color: 'text-purple-600'
  }
];

const XiaoJiaHomepage = () => {
  const [currentUser, setCurrentUser] = useState({
    role: 'socialWorker',
    name: '李社工',
    avatar: '👩‍💼',
    permissions: ['档案管理', '服务审核']
  });
  
  const [notifications, setNotifications] = useState(3);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  const role = ROLES[currentUser.role];
  const quickActions = QUICK_ACTIONS[currentUser.role];
  const statsData = STATS_DATA[currentUser.role];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 模拟刷新数据
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
    // 模拟页面跳转
    console.log(`导航到: ${action.title}`);
  };

  const RoleSelector = () => (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-2">
      <div className="text-xs text-gray-500 mb-2">切换角色（测试用）</div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(ROLES).map(([key, roleData]) => (
          <button
            key={key}
            className={`px-3 py-2 rounded-md text-xs transition-colors ${
              currentUser.role === key 
                ? `${roleData.bgColor} ${roleData.textColor} ${roleData.borderColor} border`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentUser({
              role: key,
              name: `${roleData.icon} ${roleData.name}`,
              avatar: roleData.icon,
              permissions: ['基础权限']
            })}
          >
            {roleData.icon} {roleData.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSelector />
      
      {/* 顶部用户信息栏 */}
      <div className={`${role.bgColor} ${role.borderColor} border-b`}>
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{role.icon}</div>
              <div>
                <h1 className={`text-lg font-semibold ${role.textColor}`}>
                  {currentUser.name} ({role.name})
                </h1>
                <p className="text-sm text-gray-600">
                  {currentUser.permissions.join(' • ')} ✅
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleRefresh}
                className={`p-2 rounded-full ${role.bgColor} ${role.textColor} transition-transform ${
                  isRefreshing ? 'animate-spin' : 'hover:scale-110'
                }`}
              >
                <RefreshCw size={20} />
              </button>
              <div className="relative">
                <Bell size={20} className={role.textColor} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片区域 */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {statsData.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon size={24} className={stat.color} />
              </div>
              {stat.change && (
                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 快速操作网格 */}
      <div className="px-4 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`bg-white rounded-lg p-4 shadow-sm border transition-all duration-200 hover:shadow-md active:scale-95 ${
                selectedAction?.id === action.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <action.icon size={28} className={action.color} />
                <div className="text-center">
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 最近活动 */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近动态</h2>
          <button className="text-blue-600 text-sm flex items-center space-x-1">
            <span>查看全部</span>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm border">
          {RECENT_ACTIVITIES.map((activity, index) => (
            <div key={activity.id} className={`flex items-center p-4 ${
              index !== RECENT_ACTIVITIES.length - 1 ? 'border-b border-gray-100' : ''
            }`}>
              <div className={`p-2 rounded-full bg-gray-50 mr-3`}>
                <activity.icon size={16} className={activity.color} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部导航提示 */}
      <div className="px-4 pb-20">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-3">
            <Home size={20} className="text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                使用底部导航快速切换
              </p>
              <p className="text-xs text-blue-700">
                档案 • 服务 • 统计 • 更多功能
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XiaoJiaHomepage;