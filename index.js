const express = require('express');
const webPush = require('web-push');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
require('./cron');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

// Настройка Web Push
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webPush.setVapidDetails(
  'mailto:example@yourdomain.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Работа с подписками
const filePath = path.join(__dirname, 'subscriptions.json');

function loadSubscriptions() {
  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  }
  return [];
}

function saveSubscriptions(subscriptions) {
  fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));
}

function validateSubscription(subscription) {
  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    console.error('Некорректная подписка', subscription);
    return false;
  }
  return true;
}

function removeSubscription(subscriptionToRemove) {
  const subscriptions = loadSubscriptions();
  const updated = subscriptions.filter(sub => sub.endpoint !== subscriptionToRemove.endpoint);
  saveSubscriptions(updated);
  console.log(`Удалена устаревшая подписка: ${subscriptionToRemove.endpoint}`);
}

// Отправка уведомлений
function sendNotification(subscription, payload) {
  if (!validateSubscription(subscription)) {
    return Promise.reject('Некорректная подписка');
  }

  return webPush.sendNotification(subscription, JSON.stringify(payload))
    .catch(err => {
      console.error('Ошибка при отправке уведомления:', err);
      if (err.statusCode === 410 || err.statusCode === 404) {
        removeSubscription(subscription);
      }
    });
}

// Отправка всем
function sendNotificationsToAll(payload) {
  const subscriptions = loadSubscriptions();
  return Promise.all(subscriptions.map(subscription => sendNotification(subscription, payload)));
}

// Роут для подписки
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const subscriptions = loadSubscriptions();

  const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    saveSubscriptions(subscriptions);
    console.log('Новая подписка добавлена');
  } else {
    console.log('Подписка уже существует');
  }

  res.status(201).json({ message: 'Подписка успешно обработана!' });
});

// Роут отправки уведомления
app.post('/send-notification', (req, res) => {
  const { message } = req.body;
  const payload = { title: 'Напоминание', body: message };

  sendNotificationsToAll(payload)
    .then(() => res.status(200).json({ message: 'Уведомление отправлено всем подписчикам' }))
    .catch(err => res.status(500).json({ error: 'Ошибка при отправке уведомлений', details: err }));
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Push-сервер работает на http://localhost:${port}`);
});
