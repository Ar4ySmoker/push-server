const webPush = require('web-push');
const fs = require('fs');
const path = require('path');

// Загружаем подписки из файла
function loadSubscriptions() {
    const filePath = path.join(__dirname, 'subscriptions.json');
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath);
      const subscriptions = JSON.parse(rawData);
      
      // Проверим, что ключи подписки валидны
      subscriptions.forEach(subscription => {
        if (subscription.keys && subscription.keys.p256dh.length !== 65) {
          console.error('Некорректная длина p256dh', subscription);
        }
      });
  
      return subscriptions;
    }
    return [];
  }
  

// Сохраняем подписки в файл
function saveSubscriptions(subscriptions) {
  const filePath = path.join(__dirname, 'subscriptions.json');
  fs.writeFileSync(filePath, JSON.stringify(subscriptions));
}

// Отправка уведомлений
function sendNotification(subscription, payload) {
  return webPush.sendNotification(subscription, JSON.stringify(payload))
    .catch(err => {
      console.error('Ошибка при отправке уведомления:', err);
    });
}

// Отправить уведомление всем подписчикам
function sendNotificationsToAll(payload) {
  const subscriptions = loadSubscriptions();
  return Promise.all(subscriptions.map(subscription => sendNotification(subscription, payload)));
}

module.exports = {
  sendNotificationsToAll,
  loadSubscriptions,
  saveSubscriptions
};
