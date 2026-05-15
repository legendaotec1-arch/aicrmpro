import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import axios from 'axios';

const DAYS_OF_WEEK = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function MasterDashboard() {
  const navigate = useNavigate();
  const { user, logout, api } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [link, setLink] = useState('');
  
  // Формы
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [priceForm, setPriceForm] = useState({ name: '', price: '', duration_minutes: 60 });
  const [showAddException, setShowAddException] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({ exception_date: '', is_working: false });
  const [showManualBook, setShowManualBook] = useState(false);
  const [manualBookForm, setManualBookForm] = useState({ clientName: '', clientPhone: '', serviceName: '', appointmentTime: '' });
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [profileForm, setProfileForm] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [profileRes, scheduleRes, pricesRes, portfolioRes, appointmentsRes, clientsRes, linkRes] = await Promise.all([
        api.get('/master/me/profile'),
        api.get('/master/me/schedule'),
        api.get('/master/me/prices'),
        api.get('/master/me/portfolio'),
        api.get('/appointments'),
        api.get('/master/me/clients'),
        api.get('/master/me/link')
      ]);
      
      setProfile(profileRes.data);
      setProfileForm(profileRes.data);
      setSchedule(scheduleRes.data);
      setPriceList(pricesRes.data);
      setPortfolio(portfolioRes.data);
      setAppointments(appointmentsRes.data);
      setClients(clientsRes.data);
      setLink(linkRes.data.link);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Профиль
  const handleProfileUpdate = async () => {
    try {
      await api.put('/master/me/profile', profileForm);
      alert('Профиль обновлен');
      loadData();
    } catch (error) {
      alert('Ошибка при обновлении профиля');
    }
  };

  // Расписание
  const handleScheduleSave = async (dayIndex, data) => {
    try {
      const newSchedule = [...schedule];
      const dayIndex2 = newSchedule.findIndex(s => s.day_of_week === dayIndex);
      
      if (dayIndex2 >= 0) {
        newSchedule[dayIndex2] = { ...newSchedule[dayIndex2], ...data };
      } else {
        newSchedule.push({ day_of_week: dayIndex, ...data });
      }
      
      await api.post('/master/me/schedule', { schedule: newSchedule });
      loadData();
    } catch (error) {
      alert('Ошибка при сохранении расписания');
    }
  };

  // Прайс-лист
  const handlePriceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/master/me/prices', priceForm);
      setShowAddPrice(false);
      setPriceForm({ name: '', price: '', duration_minutes: 60 });
      loadData();
    } catch (error) {
      alert('Ошибка при сохранении');
    }
  };

  const handlePriceDelete = async (id) => {
    if (!confirm('Удалить позицию?')) return;
    try {
      await api.delete(`/master/me/prices/${id}`);
      loadData();
    } catch (error) {
      alert('Ошибка при удалении');
    }
  };

  // Исключения
  const handleExceptionSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/master/me/exceptions', exceptionForm);
      setShowAddException(false);
      setExceptionForm({ exception_date: '', is_working: false });
      loadData();
    } catch (error) {
      alert('Ошибка при сохранении');
    }
  };

  // Запись вручную
  const handleManualBook = async (e) => {
    e.preventDefault();
    try {
      await api.post('/appointments', manualBookForm);
      setShowManualBook(false);
      setManualBookForm({ clientName: '', clientPhone: '', serviceName: '', appointmentTime: '' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при создании записи');
    }
  };

  // Рассылка
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      const res = await api.post('/master/me/broadcast', { message: broadcastMessage });
      alert(`Рассылка отправлена ${res.data.recipients} клиентам`);
      setShowBroadcast(false);
      setBroadcastMessage('');
    } catch (error) {
      alert('Ошибка при отправке рассылки');
    }
  };

  // Удаление записи
  const handleDeleteAppointment = async (id) => {
    if (!confirm('Удалить запись?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      loadData();
    } catch (error) {
      alert('Ошибка при удалении');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM MAX</h1>
            <p className="text-gray-500">{profile?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Ваша ссылка:</p>
              <a href={link} target="_blank" className="text-sm text-primary-600 hover:underline truncate max-w-xs block">
                {link}
              </a>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <nav className="w-64 bg-white rounded-lg shadow-sm h-fit">
            <div className="p-4 space-y-1">
              <button
                onClick={() => setActiveSection('appointments')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeSection === 'appointments' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                📅 Записи
              </button>
              <button
                onClick={() => setActiveSection('clients')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeSection === 'clients' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                👥 Клиенты
              </button>
              <button
                onClick={() => setActiveSection('schedule')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeSection === 'schedule' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                ⏰ Расписание
              </button>
              <button
                onClick={() => setActiveSection('prices')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeSection === 'prices' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                💰 Прайс-лист
              </button>
              <button
                onClick={() => setActiveSection('portfolio')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeSection === 'portfolio' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                🖼️ Портфолио
              </button>
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  activeSection === 'profile' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                ⚙️ Настройки
              </button>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1">
            {/* Записи */}
            {activeSection === 'appointments' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Записи клиентов</h2>
                  <button
                    onClick={() => setShowManualBook(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    + Записать клиента
                  </button>
                </div>

                {appointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Записей пока нет</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="pb-3 text-sm font-medium text-gray-500">Клиент</th>
                          <th className="pb-3 text-sm font-medium text-gray-500">Услуга</th>
                          <th className="pb-3 text-sm font-medium text-gray-500">Дата/Время</th>
                          <th className="pb-3 text-sm font-medium text-gray-500">Статус</th>
                          <th className="pb-3 text-sm font-medium text-gray-500">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(apt => (
                          <tr key={apt.id} className="border-b last:border-0">
                            <td className="py-3">
                              <p className="font-medium text-gray-900">{apt.client_name || 'Клиент'}</p>
                              {apt.client_phone && <p className="text-sm text-gray-500">{apt.client_phone}</p>}
                            </td>
                            <td className="py-3">
                              <p className="text-gray-900">{apt.service_name}</p>
                              {apt.service_price && <p className="text-sm text-gray-500">{apt.service_price} ₽</p>}
                            </td>
                            <td className="py-3">
                              <p className="text-gray-900">{new Date(apt.appointment_time).toLocaleDateString('ru-RU')}</p>
                              <p className="text-sm text-gray-500">{new Date(apt.appointment_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {apt.status === 'confirmed' ? 'Подтверждена' : apt.status === 'cancelled' ? 'Отменена' : 'Завершена'}
                              </span>
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handleDeleteAppointment(apt.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Удалить
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Клиенты */}
            {activeSection === 'clients' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Клиенты</h2>
                  <button
                    onClick={() => setShowBroadcast(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    📢 Рассылка
                  </button>
                </div>

                {clients.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Клиентов пока нет</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map(client => (
                      <div key={client.id} className="border rounded-lg p-4">
                        <h3 className="font-medium text-gray-900">{client.name || 'Без имени'}</h3>
                        {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
                        {client.max_user_id && <p className="text-xs text-gray-400 mt-1">ID: {client.max_user_id}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Расписание */}
            {activeSection === 'schedule' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Рабочие дни</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(day => {
                      const daySchedule = schedule.find(s => s.day_of_week === day);
                      return (
                        <div key={day} className="border rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-2">{DAYS_OF_WEEK[day]}</h3>
                          {daySchedule ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">
                                {daySchedule.start_time} - {daySchedule.end_time}
                              </span>
                              <button
                                onClick={() => handleScheduleSave(day, { is_day_off: true })}
                                className="ml-2 text-sm text-red-600 hover:underline"
                              >
                                Выходной
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleScheduleSave(day, { start_time: '09:00', end_time: '18:00', is_day_off: false })}
                              className="text-sm text-primary-600 hover:underline"
                            >
                              Установить часы
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Исключения (праздники, отпуска)</h2>
                    <button
                      onClick={() => setShowAddException(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      + Добавить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Прайс-лист */}
            {activeSection === 'prices' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Прайс-лист</h2>
                  <button
                    onClick={() => setShowAddPrice(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    + Добавить услугу
                  </button>
                </div>

                {priceList.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Прайс-лист пуст</p>
                ) : (
                  <div className="space-y-3">
                    {priceList.map(item => (
                      <div key={item.id} className="flex items-center justify-between border rounded-lg p-4">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-500">{item.duration_minutes} мин</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-lg">{item.price} ₽</span>
                          <button
                            onClick={() => handlePriceDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Портфолио */}
            {activeSection === 'portfolio' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Портфолио</h2>
                
                {portfolio.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Фото пока не добавлены</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {portfolio.map(item => (
                      <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={item.image_url} alt={item.title} className="object-cover w-full h-full" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Профиль */}
            {activeSection === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Настройки профиля</h2>
                
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                    <input
                      type="text"
                      value={profileForm.name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Название салона</label>
                    <input
                      type="text"
                      value={profileForm.salon_name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, salon_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <textarea
                      value={profileForm.description || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                    <input
                      type="text"
                      value={profileForm.phone || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                    <input
                      type="text"
                      value={profileForm.address || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <button
                    onClick={handleProfileUpdate}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      
      {/* Добавление услуги */}
      {showAddPrice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Добавить услугу</h3>
            <form onSubmit={handlePriceSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Название услуги"
                required
                value={priceForm.name}
                onChange={(e) => setPriceForm({ ...priceForm, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="number"
                placeholder="Цена"
                required
                value={priceForm.price}
                onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="number"
                placeholder="Длительность (минут)"
                required
                value={priceForm.duration_minutes}
                onChange={(e) => setPriceForm({ ...priceForm, duration_minutes: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPrice(false)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ручная запись */}
      {showManualBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Записать клиента</h3>
            <form onSubmit={handleManualBook} className="space-y-4">
              <input
                type="text"
                placeholder="Имя клиента"
                value={manualBookForm.clientName}
                onChange={(e) => setManualBookForm({ ...manualBookForm, clientName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Телефон"
                value={manualBookForm.clientPhone}
                onChange={(e) => setManualBookForm({ ...manualBookForm, clientPhone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Услуга"
                required
                value={manualBookForm.serviceName}
                onChange={(e) => setManualBookForm({ ...manualBookForm, serviceName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="datetime-local"
                required
                value={manualBookForm.appointmentTime}
                onChange={(e) => setManualBookForm({ ...manualBookForm, appointmentTime: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">
                  Записать
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualBook(false)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Рассылка */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Рассылка клиентам</h3>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Введите сообщение..."
              rows={4}
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleBroadcast}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg"
              >
                Отправить
              </button>
              <button
                onClick={() => setShowBroadcast(false)}
                className="flex-1 py-2 border rounded-lg"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterDashboard;