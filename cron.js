const cron = require('node-cron');
const { sendNotificationsToAll } = require('./push'); // импортируем функцию отправки уведомлений

// Настроим cron-задачу, которая будет выполняться каждый день в 9:00
cron.schedule('0 9 * * *', () => {
  console.log('Запуск cron-задачи: отправка уведомлений');

  // Текст уведомления
  const message = 'Не забудьте выполнить свои задачи!';

  // Отправляем уведомления всем подписчикам
  sendNotificationsToAll({ title: 'Напоминание', body: message })
    .then(() => {
      console.log('Уведомления отправлены');
    })
    .catch(err => {
      console.error('Ошибка при отправке уведомлений через cron:', err);
    });
});

console.log('Cron-задание настроено на отправку уведомлений каждый день в 9:00');
