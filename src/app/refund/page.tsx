import LegalLayout from '@/app/legal/LegalLayout';

export const metadata = {
  title: '退款政策 - 面试搭子',
  description: '面试搭子退款政策，明确退款条件和流程',
};

export default function RefundPage() {
  return (
    <LegalLayout title="退款政策" lastUpdated="2025年1月15日">
      <p className="text-sm text-gray-500 mb-6">
        我们理解您在购买服务后可能会改变主意。以下是面试搭子的退款政策，请仔细阅读。
      </p>

      <h2>一、退款原则</h2>
      
      <p>面试搭子作为数字商品服务提供商，我们承诺：</p>
      <ul>
        <li><strong>依法合规</strong>：严格遵守《中华人民共和国消费者权益保护法》及相关法规</li>
        <li><strong>公平合理</strong>：在保护消费者权益的同时，维护公平的交易秩序</li>
        <li><strong>及时处理</strong>：在规定时限内完成退款处理</li>
      </ul>

      <h2>二、退款条件与期限</h2>
      
      <h3>2.1 单次体验（9.9元）</h3>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 my-4">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">情况</th>
            <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">退款政策</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">未使用（购买后24小时内且未开始任何练习）</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-green-600 dark:text-green-400">全额退款</td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">已使用但效果不满意</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-yellow-600 dark:text-yellow-400">不支持退款（详见下方说明）</td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">购买后7天内，尚未开始使用</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-green-600 dark:text-green-400">全额退款</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 月卡会员（49元/月）</h3>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 my-4">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">情况</th>
            <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">退款政策</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">购买后7天内，且使用次数≤3次</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-green-600 dark:text-green-400">全额退款</td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">购买后7天内，使用次数&gt;3次</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-yellow-600 dark:text-yellow-400">按剩余天数比例退款</td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">购买超过7天</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-red-600 dark:text-red-400">不支持退款</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 季卡会员（119元/季度）</h3>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 my-4">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">情况</th>
            <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">退款政策</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">购买后15天内，且使用次数≤5次</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-green-600 dark:text-green-400">全额退款</td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">购买后15天内，使用次数&gt;5次</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-yellow-600 dark:text-yellow-400">按剩余天数比例退款</td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2">购买超过15天</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2 text-red-600 dark:text-red-400">不支持退款</td>
          </tr>
        </tbody>
      </table>

      <h2>三、不支持退款的情况</h2>
      
      <p>以下情况，我们可能无法为您提供退款：</p>
      <ul>
        <li>数字商品（虚拟服务）一经使用，即视为服务已完成</li>
        <li>超过退款期限的情况</li>
        <li>因用户自身原因（如重复购买、操作失误）导致的购买</li>
        <li>通过非法渠道或作弊方式获得的付费服务</li>
        <li>因用户违反用户协议导致账户被封禁</li>
      </ul>

      <h3>特别说明</h3>
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <p className="text-sm">
          由于面试搭子提供的是数字化商品和服务（AI模拟面试练习），一经使用即无法回收，因此我们恳请您：
        </p>
        <ul className="mt-2 text-sm">
          <li>• 在购买前充分了解服务内容</li>
          <li>• 先体验免费功能（如紧张类型诊断）</li>
          <li>• 如有疑问，联系客服咨询后再购买</li>
        </ul>
      </div>

      <h2>四、退款申请流程</h2>
      
      <h3>4.1 申请方式</h3>
      <p>如需申请退款，请通过以下方式联系我们：</p>
      <ul>
        <li><strong>应用内客服</strong>：进入"我的 → 帮助与反馈 → 申请退款"</li>
        <li><strong>邮箱</strong>：refund@mianshidazi.com</li>
        <li><strong>工作时间</strong>：工作日 9:00-18:00</li>
      </ul>

      <h3>4.2 申请材料</h3>
      <p>退款申请需包含以下信息：</p>
      <ul>
        <li>您的账户信息（手机号或微信昵称）</li>
        <li>购买时间、订单号或交易流水号</li>
        <li>退款原因说明</li>
        <li>相关截图证明（如有）</li>
      </ul>

      <h3>4.3 处理时限</h3>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 my-4">
        <tbody>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">审核时间</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2">1-3个工作日内完成审核</td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">退款到账</td>
            <td className="border border-gray-300 dark:border-gray-600 p-2">退款申请通过后，3-7个工作日内原路退回支付账户</td>
          </tr>
        </tbody>
      </table>

      <h2>五、自动续费取消</h2>
      
      <p>如您已开启自动续费功能，可以按以下方式取消：</p>
      <ul>
        <li>进入"我的 → 会员中心 → 自动续费管理"</li>
        <li>点击"关闭自动续费"按钮</li>
        <li>确认关闭后，将不再自动扣费</li>
      </ul>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        <strong>注意：</strong>取消自动续费不会影响您当前会员有效期，到期后不再自动扣费续期。
      </p>

      <h2>六、支付平台说明</h2>
      
      <p>我们的支付服务由虎皮椒提供支持：</p>
      <ul>
        <li>支付过程中如有问题，请联系虎皮椒客服：consulting@xunhuapi.com</li>
        <li>退款将原路返回至您的支付账户（支付宝）</li>
        <li>如支付账户已注销或异常，退款可能需要人工处理</li>
      </ul>

      <h2>七、特殊情况</h2>
      
      <h3>7.1 技术故障</h3>
      <p>如因我们服务的技术故障导致您无法正常使用付费功能（如AI对话无法响应超过24小时），您可以申请相应补偿，我们会根据实际情况处理。</p>

      <h3>7.2 服务变更</h3>
      <p>如因我们服务重大变更导致您权益受损（如服务全面停止），我们将提前通知并提供合理的退款或补偿方案。</p>

      <h2>八、联系我们</h2>
      
      <p>如有退款相关问题，请联系我们：</p>
      <ul>
        <li><strong>客服邮箱</strong>：refund@mianshidazi.com</li>
        <li><strong>工作时间</strong>：工作日 9:00-18:00</li>
        <li><strong>响应时间</strong>：24小时内回复</li>
      </ul>

      <hr className="my-8" />
      
      <p className="text-sm text-gray-500">
        本退款政策是用户协议的重要组成部分，与用户协议一并构成完整的退款条款。
      </p>
    </LegalLayout>
  );
}
