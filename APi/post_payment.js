const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

router.post('/', async (req, res) => {
  const {
    amount,
    orderInfo = 'Thanh toán đơn hàng với MoMo',
    redirectUrl = process.env.MOMO_REDIRECT_URL || 'https://payment.doanappfood.vn/result',
    ipnUrl = process.env.MOMO_IPN_URL || 'https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b',
    orderGroupId = '',
    extraData = '',
    autoCapture = true,
    lang = 'vi'
  } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Thiếu thông tin amount' });
  }

  try {
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    const requestType = 'payWithMethod';
    const orderId = partnerCode + Date.now();
    const requestId = orderId;

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`
    ].join('&');

    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode,
      partnerName: 'Test',
      storeId: 'MomoTestStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      orderGroupId,
      signature
    };

    const options = {
      method: 'POST',
      url: 'https://test-payment.momo.vn/v2/gateway/api/create',
      headers: {
        'Content-Type': 'application/json'
      },
      data: requestBody
    };

    const result = await axios(options);
    return res.status(200).json(result.data);
  } catch (error) {
    console.error('LỖI PAYMENT:', error);
    return res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

router.post('/callback', async (req, res) => {
  /**
    resultCode = 0: giao dịch thành công.
    resultCode = 9000: giao dịch được cấp quyền (authorization) thành công .
    resultCode <> 0: giao dịch thất bại.
   */
  console.log('callback: ');
  console.log(req.body);
  /**
   * Dựa vào kết quả này để update trạng thái đơn hàng
   * Kết quả log:
   * {
        partnerCode: 'MOMO',
        orderId: 'MOMO1712108682648',
        requestId: 'MOMO1712108682648',
        amount: 10000,
        orderInfo: 'pay with MoMo',
        orderType: 'momo_wallet',
        transId: 4014083433,
        resultCode: 0,
        message: 'Thành công.',
        payType: 'qr',
        responseTime: 1712108811069,
        extraData: '',
        signature: '10398fbe70cd3052f443da99f7c4befbf49ab0d0c6cd7dc14efffd6e09a526c0'
      }
   */

  return res.status(204).json(req.body);
});

router.post('/check-status', async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Thiếu thông tin orderId' });
  }

  const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
  const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
  const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
  const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${orderId}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  const requestBody = JSON.stringify({
    partnerCode: 'MOMO',
    requestId: orderId,
    orderId: orderId,
    signature: signature,
    lang: 'vi',
  });

  // options for axios
  const options = {
    method: 'POST',
    url: 'https://test-payment.momo.vn/v2/gateway/api/query',
    headers: {
      'Content-Type': 'application/json',
    },
    data: requestBody,
  };

  const result = await axios(options);

  return res.status(200).json(result.data);
});

module.exports = router;

