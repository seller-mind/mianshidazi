import LegalLayout from '@/app/legal/LegalLayout';

export const metadata = {
  title: '隐私政策 - 面试搭子',
  description: '面试搭子隐私政策，详细说明我们如何收集、使用和保护您的个人信息',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="隐私政策" lastUpdated="2025年1月15日">
      <p className="text-sm text-gray-500 mb-6">
        更新提示：根据《个人信息保护法》（PIPL）及相关法规要求，我们对隐私政策进行了更新，请您仔细阅读。
      </p>

      <h2>一、信息收集与使用</h2>
      
      <h3>1.1 我们收集的信息</h3>
      <p>为了向您提供面试搭子服务，我们会收集以下信息：</p>
      <ul>
        <li><strong>账户信息</strong>：微信昵称、头像（通过微信授权获取）</li>
        <li><strong>联系方式</strong>：手机号码（用于账号登录和重要通知）</li>
        <li><strong>使用数据</strong>：您进行的面试练习记录、紧张类型诊断结果、对话内容</li>
        <li><strong>设备信息</strong>：设备型号、操作系统版本，用于优化服务体验</li>
        <li><strong>支付信息</strong>：通过虎皮椒支付系统处理的交易信息（我们不存储完整银行卡信息）</li>
      </ul>

      <h3>1.2 我们如何使用信息</h3>
      <ul>
        <li>提供AI面试模拟和紧张陪伴服务</li>
        <li>生成个性化面试报告和建议</li>
        <li>发送服务相关的通知（如会员到期提醒）</li>
        <li>改善我们的AI模型和服务质量</li>
        <li>处理支付和退款请求</li>
      </ul>

      <h2>二、数据存储与跨境传输</h2>
      
      <h3>2.1 数据存储地点</h3>
      <p className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
        <strong>⚠️ 重要提示：</strong>由于技术架构原因，您的个人信息和对话数据存储在位于海外（新加坡数据中心）的Supabase服务器上。根据《中华人民共和国个人信息保护法》相关规定，我们特此告知您数据跨境传输的情况，并依法获得您的同意。
      </p>

      <h3>2.2 数据保留期限</h3>
      <ul>
        <li><strong>账户数据</strong>：您注销账户后30日内删除</li>
        <li><strong>对话记录</strong>：会员有效期满后90日内自动清除</li>
        <li><strong>支付记录</strong>：根据财务法规保留至少5年</li>
      </ul>

      <h3>2.3 数据安全措施</h3>
      <p>我们采取以下措施保护您的数据安全：</p>
      <ul>
        <li>数据传输采用TLS加密</li>
        <li>数据库访问实施严格的权限控制</li>
        <li>定期进行安全审计和漏洞扫描</li>
        <li>制定数据安全应急预案</li>
      </ul>

      <h2>三、信息共享</h2>
      
      <p>未经您的同意，我们不会与任何第三方共享您的个人信息，但以下情况除外：</p>
      <ul>
        <li><strong>阿里云百炼</strong>：用于AI对话生成，您的对话内容将传输至阿里云服务</li>
        <li><strong>虎皮椒支付</strong>：处理支付请求，遵守其隐私政策</li>
        <li><strong>微软Edge TTS</strong>：提供语音朗读功能</li>
        <li><strong>法律要求</strong>：根据法律法规、政府要求或司法程序必须提供时</li>
      </ul>

      <h2>四、您的权利</h2>
      
      <p>根据《个人信息保护法》，您享有以下权利：</p>
      <ul>
        <li><strong>访问权</strong>：查询您的个人信息和处理情况</li>
        <li><strong>更正权</strong>：更正不准确的个人信息</li>
        <li><strong>删除权</strong>：要求删除您的个人信息</li>
        <li><strong>撤回同意</strong>：撤回您之前同意的数据处理授权</li>
        <li><strong>注销账户</strong>：通过联系客服申请注销账户</li>
      </ul>

      <h3>如何行使您的权利</h3>
      <p>如需行使上述权利，请通过以下方式联系我们：</p>
      <ul>
        <li>邮箱：privacy@mianshidazi.com</li>
        <li>客服：在应用内联系在线客服</li>
      </ul>
      <p>我们将在15个工作日内响应您的请求。</p>

      <h2>五、未成年人保护</h2>
      
      <p>面试搭子服务主要面向求职面试人群，我们建议：</p>
      <ul>
        <li><strong>未满18周岁</strong>的用户在使用前应征求监护人同意</li>
        <li>我们不会故意收集未满14周岁儿童的个人信息</li>
        <li>如监护人发现未成年人未经同意使用了服务，请联系我们予以删除</li>
      </ul>

      <h2>六、Cookie与追踪</h2>
      
      <p>我们使用Cookie和类似技术来：</p>
      <ul>
        <li>记住您的登录状态</li>
        <li>分析网站访问量和使用习惯</li>
        <li>提供个性化内容推荐</li>
      </ul>
      <p>您可以在浏览器设置中管理或拒绝Cookie，但这可能影响部分功能。</p>

      <h2>七、隐私政策更新</h2>
      
      <p>我们可能会不时更新本隐私政策。重大变更将：</p>
      <ul>
        <li>通过应用内通知告知您</li>
        <li>在更新前显著位置提示</li>
        <li>重新获取您的同意（必要时）</li>
      </ul>

      <h2>八、联系我们</h2>
      
      <p>如果您对本隐私政策有任何疑问或担忧，请联系我们：</p>
      <ul>
        <li><strong>运营主体</strong>：[公司名称]</li>
        <li><strong>联系邮箱</strong>：privacy@mianshidazi.com</li>
        <li><strong>注册地址</strong>：[公司地址]</li>
      </ul>

      <hr className="my-8" />
      
      <p className="text-sm text-gray-500">
        本隐私政策依据《中华人民共和国个人信息保护法》、《中华人民共和国网络安全法》、《生成式人工智能服务管理暂行办法》等法律法规制定。
      </p>
    </LegalLayout>
  );
}
