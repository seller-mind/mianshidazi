export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">支付成功</h1>
        <p className="text-gray-600 text-center">您的订单已支付成功，权益已到账！</p>
        <div className="mt-4 text-center">
          <a href="/" className="text-blue-600 hover:underline">返回首页</a>
        </div>
      </div>
    </div>
  );
}
