import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';

function ClientPage() {
  const { masterId } = useParams();
  const navigate = useNavigate();
  const [master, setMaster] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, [masterId]);

  useEffect(() => {
    if (selectedDate && master) {
      loadAvailableSlots();
    }
  }, [selectedDate, master]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/master/${masterId}`);
      setMaster(res.data.master);
      setPortfolio(res.data.portfolio);
      setPriceList(res.data.priceList);
    } catch (error) {
      console.error('Error loading master data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await axios.get(`/api/client/${masterId}/slots?date=${dateStr}`);
      setAvailableSlots(res.data);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !selectedService) return;

    try {
      setBooking(true);
      const maxUserId = `demo_${Date.now()}`; // В реальном приложении из MAX
      
      await axios.post('/api/client/book', {
        masterId,
        maxUserId,
        name: formData.name,
        phone: formData.phone,
        appointmentTime: selectedSlot,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        duration: selectedService.duration_minutes
      });

      alert('Вы успешно записаны! Напоминание придет за сутки и за 3 часа до записи.');
      setShowBookingForm(false);
      setSelectedSlot(null);
      setSelectedService(null);
      setFormData({ name: '', phone: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при записи');
    } finally {
      setBooking(false);
    }
  };

  const tileDisabled = ({ date }) => {
    if (!master) return false;
    const dayOfWeek = date.getDay();
    // Воскресенье = 0
    return false; // Можно добавить проверку по расписанию мастера
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!master) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Мастер не найден</h2>
          <p className="text-gray-500 mt-2">Проверьте ссылку или обратитесь к мастеру</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {master.logo_url && (
              <img 
                src={master.logo_url} 
                alt="logo" 
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{master.name}</h1>
              {master.salon_name && (
                <p className="text-gray-500">{master.salon_name}</p>
              )}
            </div>
          </div>
          {master.description && (
            <p className="mt-4 text-gray-600">{master.description}</p>
          )}
          {master.address && (
            <div className="mt-3 flex items-center gap-2 text-gray-500">
              <span>📍</span>
              <span>{master.address}</span>
              {master.yandex_maps_link && (
                <a 
                  href={master.yandex_maps_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline ml-2"
                >
                  Показать на карте
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Информация
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'portfolio'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Портфолио
            </button>
            <button
              onClick={() => setActiveTab('price')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'price'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Прайс-лист
            </button>
            <button
              onClick={() => setActiveTab('booking')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'booking'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Запись
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'info' && (
          <div className="space-y-6">
            {master.phone && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Контакты</h3>
                <p className="text-gray-600">{master.phone}</p>
              </div>
            )}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Как записаться</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-2">
                <li>Выберите услугу в разделе "Прайс-лист"</li>
                <li>Выберите удобную дату и время в разделе "Запись"</li>
                <li>Заполните форму записи</li>
                <li>Получите подтверждение и напоминания</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {portfolio.length === 0 ? (
              <p className="col-span-full text-gray-500 text-center py-8">
                Фото пока не добавлены
              </p>
            ) : (
              portfolio.map(item => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="object-cover w-full h-full"
                  />
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm">{item.title}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'price' && (
          <div className="space-y-3">
            {priceList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Прайс-лист пока не добавлен</p>
            ) : (
              priceList.map(item => (
                <div 
                  key={item.id}
                  className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4"
                >
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.duration_minutes} мин</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg text-primary-600">{item.price} ₽</p>
                    <button
                      onClick={() => {
                        setSelectedService(item);
                        setActiveTab('booking');
                      }}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Записаться
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'booking' && (
          <div className="space-y-6">
            {/* Выбор услуги */}
            {!selectedService && priceList.length > 0 && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Выберите услугу</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {priceList.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedService(item)}
                      className="text-left p-3 border rounded-lg hover:border-primary-500 transition-colors"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-500 ml-2">{item.price} ₽</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Выбранная услуга */}
            {selectedService && (
              <div className="bg-primary-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedService.name}</p>
                  <p className="text-sm text-gray-500">{selectedService.duration_minutes} мин · {selectedService.price} ₽</p>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Календарь */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Выберите дату</h3>
              <div className="flex justify-center">
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  tileDisabled={tileDisabled}
                  minDate={new Date()}
                  locale="ru-RU"
                />
              </div>
            </div>

            {/* Слоты времени */}
            {selectedDate && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Доступное время на {selectedDate.toLocaleDateString('ru-RU')}
                </h3>
                {availableSlots.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Нет свободного времени на этот день</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map((slot, index) => {
                      const time = new Date(slot);
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                            selectedSlot === slot
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Кнопка записи */}
            {selectedService && selectedSlot && !showBookingForm && (
              <button
                onClick={() => setShowBookingForm(true)}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Записаться
              </button>
            )}

            {/* Форма записи */}
            {showBookingForm && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Введите ваши данные</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ваше имя"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <input
                    type="tel"
                    placeholder="Телефон"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={handleBooking}
                    disabled={booking || !formData.name}
                    className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {booking ? 'Записываем...' : 'Подтвердить запись'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientPage;