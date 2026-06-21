import axios from 'axios';

// Базовая конфигурация
const API_BASE = '/api';

// Создаём axios инстанс для запросов к мастеру
const masterApiInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Задержка для имитации (больше не используется, оставлена для совместимости)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Адаптер данных мастера из API к формату компонента
function adaptMasterData(apiResponse) {
  const { master, teamMasters, priceGroups, portfolio, priceList, reviewSummary, reviews, booking } = apiResponse;

  // Собираем специализации из teamMasters
  const specializations = teamMasters && teamMasters.length > 0
    ? teamMasters.map(m => m.specialty || m.name)
    : [master.salon_name || 'Услуги салона'];

  // Аватар: если нет логотипа - используем placeholder с инициалами
  const avatarUrl = master.logo_url
    ? (master.logo_url.startsWith('http') ? master.logo_url : master.logo_url)
    : null;

  return {
    id: master.id,
    name: master.display_title || master.salon_name || master.name || 'Мастер',
    avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(master.display_title || master.name || 'M')}&background=0ABAB5&color=fff&size=200`,
    rating: reviewSummary?.average || 0,
    reviews: reviewSummary?.count || 0,
    experience: 0,
    specialization: specializations,
    description: master.description || '',
    address: master.address || '',
    coordinates: master.latitude && master.longitude ? [master.latitude, master.longitude] : null,
    yandexMapsLink: master.yandex_maps_link || null,
    phone: master.phone || '',
    socialLinks: (() => {
      const links = master.socialLinks || [];
      if (Array.isArray(links)) {
        const result = {};
        links.forEach(l => { result[l.id] = l.url; });
        return result;
      }
      return links;
    })(),
    client_theme: master.client_theme || 'default',
    // Дополнительные данные для компонента
    _originalData: master,
    _teamMasters: teamMasters,
    _priceGroups: priceGroups,
    _portfolio: portfolio,
    _priceList: priceList,
    _reviews: reviews,
    _booking: booking
  };
}

// API методы
export const masterApi = {
  // Получить данные мастера
  getMaster: async (id) => {
    try {
      const response = await masterApiInstance.get(`/master/${id}`);
      return adaptMasterData(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Мастер не найден');
      }
      console.error('Error fetching master:', error);
      const message = error.response?.data?.error || error.message || 'Не удалось загрузить данные мастера';
      throw new Error(message);
    }
  },

  // Получить услуги мастера
  getServices: async (masterId) => {
    try {
      const response = await masterApiInstance.get(`/master/${masterId}`);
      const { _priceList, _teamMasters } = response.data;

      // Если есть priceList - используем его как услуги
      if (_priceList && _priceList.length > 0) {
        return _priceList.map(service => ({
          id: service.id,
          name: service.name,
          duration: parseInt(service.duration_minutes) || 60,
          price: parseFloat(service.price) || 0,
          price_max: service.price_max ? parseFloat(service.price_max) : null,
          price_type: service.price_type || 'fixed',
          salon_master_id: service.salon_master_id,
          masterName: _teamMasters?.find(m => m.id === service.salon_master_id)?.name || '',
          image_url: service.image_url
        }));
      }

      // Иначе возвращаем пустой массив
      return [];
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  },

  // Получить портфолио
  getPortfolio: async (masterId) => {
    try {
      const response = await masterApiInstance.get(`/master/${masterId}`);
      const portfolio = response.data._portfolio || [];

      return portfolio.map(item => ({
        id: item.id,
        type: item.media_type || 'photo',
        url: item.image_url || item.video_url,
        thumbnail: item.thumbnail_url || item.image_url,
        videoUrl: item.video_url,
        title: item.title
      }));
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return [];
    }
  },

  // Получить видео
  getVideos: async (masterId) => {
    try {
      const response = await masterApiInstance.get(`/master/${masterId}`);
      const portfolio = response.data._portfolio || [];

      return portfolio
        .filter(item => item.media_type === 'video' || item.media_type === 'external_video')
        .map(item => ({
          id: item.id,
          type: 'video',
          url: item.video_url || item.image_url,
          thumbnail: item.thumbnail_url || item.image_url
        }));
    } catch (error) {
      console.error('Error fetching videos:', error);
      return [];
    }
  },

  // Создать запись
  createAppointment: async (data) => {
    try {
      const response = await masterApiInstance.post('/appointments', data);
      return response.data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw new Error(error.response?.data?.error || 'Не удалось создать запись');
    }
  },

  // Получить записи
  getAppointments: async () => {
    try {
      const response = await masterApiInstance.get('/appointments');
      return response.data.appointments || [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Пробуем взять из localStorage как fallback
      const stored = localStorage.getItem('master_appointments');
      return stored ? JSON.parse(stored) : [];
    }
  },

  // Удалить запись
  deleteAppointment: async (id) => {
    try {
      const response = await masterApiInstance.delete(`/appointments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      // Fallback для демо-режима
      const stored = localStorage.getItem('master_appointments');
      const appointments = stored ? JSON.parse(stored) : [];
      const filtered = appointments.filter(apt => apt.id !== id);
      localStorage.setItem('master_appointments', JSON.stringify(filtered));
      return { success: true };
    }
  },

  // Обновить запись
  updateAppointment: async (id, data) => {
    try {
      const response = await masterApiInstance.put(`/appointments/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating appointment:', error);
      // Fallback для демо-режима
      const stored = localStorage.getItem('master_appointments');
      const appointments = stored ? JSON.parse(stored) : [];
      const index = appointments.findIndex(apt => apt.id === id);
      if (index !== -1) {
        appointments[index] = { ...appointments[index], ...data };
        localStorage.setItem('master_appointments', JSON.stringify(appointments));
      }
      return { success: true };
    }
  }
};

export default masterApi;
