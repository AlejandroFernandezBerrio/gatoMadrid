document.addEventListener('DOMContentLoaded', () => {
    // Verificar que estamos en la página correcta
    if (!document.getElementById('map')) {
        console.log('No estamos en la página del mapa, saliendo...');
        return;
    }

    // Variables globales
    let map;
    let userMarker;
    let currentMarkers = [];
    let userPosition = { lat: 40.4168, lng: -3.7038 }; // Madrid por defecto

    // Inicialización
    initMap();
    setupEventListeners();
    checkAuthStatus();

    // Funciones principales
    function initMap() {
        map = L.map('map', {
            center: [userPosition.lat, userPosition.lng],
            zoom: 14,
            zoomControl: false
        });

        // Capa base
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Controles
        L.control.zoom({ position: 'topright' }).addTo(map);
        L.control.scale().addTo(map);

        // Geolocalización
        locateUser();
    }

    function locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    userPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    map.setView([userPosition.lat, userPosition.lng], 15);
                    addUserMarker();
                },
                err => {
                    console.warn('Geolocalización fallida:', err);
                    showMapNotice('Usando ubicación por defecto', 'warning');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }

    function addUserMarker() {
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.marker([userPosition.lat, userPosition.lng], {
            icon: L.divIcon({
                className: 'user-marker',
                html: '📍',
                iconSize: [30, 30]
            })
        }).addTo(map);
        userMarker.bindPopup('Tu ubicación actual').openPopup();
    }

    function setupEventListeners() {
        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                loadPlaces(this.dataset.type);
            });
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    function checkAuthStatus() {
        const token = localStorage.getItem('token');
        const favoritesSection = document.getElementById('favoritesSection');
        const userGreeting = document.getElementById('userGreeting');

        if (token && token !== 'guest' && favoritesSection) {
            favoritesSection.classList.remove('hidden');
            loadFavorites();
        }

        if (userGreeting) {
            userGreeting.textContent = token === 'guest' ? 'Invitado' : 'Usuario registrado';
        }
    }

    async function loadPlaces(type) {
        try {
            clearMarkers();
            const loadingMsg = showMapNotice(`Buscando ${typeToSpanish(type)}...`, 'info');

            const response = await fetch(`https://gatomadrid.onrender.com/places?lat=${userPosition.lat}&lng=${userPosition.lng}&type=${type}&radius=1500`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error en la API');
            }

            const places = await response.json();
            loadingMsg.remove();

            if (places.length === 0) {
                showMapNotice(`No se encontraron ${typeToSpanish(type)}. Intenta con un área más amplia.`, 'warning');
                return;
            }

            addPlaceMarkers(places);
            adjustMapView();

        } catch (err) {
            console.error('Error al cargar lugares:', err);
            showMapNotice(err.message, 'error');
        }
    }

    function addPlaceMarkers(places) {
        places.forEach(place => {
            const marker = L.marker([place.lat, place.lng], {
                icon: L.divIcon({
                    className: `${place.type}-marker`,
                    html: getMarkerIcon(place.type, place.category),
                    iconSize: [32, 32]
                }),
                riseOnHover: true
            }).addTo(map);

            marker.bindPopup(createPopupContent(place), {
                className: `${place.type}-popup`,
                maxWidth: 300
            });

            currentMarkers.push(marker);
        });
    }

    function createPopupContent(place) {
        return `
            <div class="popup-content">
                <h4>${place.name || 'Lugar sin nombre'}</h4>
                <p><strong>Tipo:</strong> ${getDetailedType(place)}</p>
                ${place.tags?.operator ? `<p><strong>Operador:</strong> ${place.tags.operator}</p>` : ''}
                ${localStorage.getItem('token') !== 'guest' ? `
                    <button class="add-favorite-btn" 
                        onclick="window.addToFavorites('${place.id}', '${place.name || place.type}', 
                                '${place.type}', ${place.lat}, ${place.lng})">
                        ★ Añadir a favoritos
                    </button>` : ''}
            </div>
        `;
    }

    // Funciones auxiliares
    function clearMarkers() {
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];
    }

    function adjustMapView() {
        if (currentMarkers.length > 0) {
            const bounds = L.latLngBounds(currentMarkers.map(m => m.getLatLng()));
            map.fitBounds(bounds.pad(0.1));
        }
    }

    function getMarkerIcon(type, category) {
        const icons = {
            restaurant: '🍽️',
            nightlife: '🍸',
            transport: getTransportIcon(category)
        };
        return icons[type] || '📍';
    }

    function getTransportIcon(category) {
        const transportIcons = {
            station: '🚉',
            bus_station: '🚏',
            bus_stop: '🚏',
            taxi: '🚖',
            tram_stop: '🚊',
            railway: '🚆'
        };
        return transportIcons[category] || '🚆';
    }

    function getDetailedType(place) {
        if (place.type !== 'transport') return typeToSpanish(place.type);
        
        const types = {
            station: 'Estación',
            bus_station: 'Estación de buses',
            bus_stop: 'Parada de bus',
            taxi: 'Taxi',
            tram_stop: 'Parada de tranvía',
            railway: 'Estación de tren'
        };
        
        return types[place.category] || 'Punto de transporte';
    }

    function typeToSpanish(type) {
        const types = {
            restaurant: 'Restaurante',
            nightlife: 'Ocio nocturno',
            transport: 'Transporte'
        };
        return types[type] || type;
    }

    function showMapNotice(message, type = 'info') {
        const notice = L.control({ position: 'topright' });
        notice.onAdd = () => {
            const div = L.DomUtil.create('div', `map-notice notice-${type}`);
            div.innerHTML = message;
            return div;
        };
        notice.addTo(map);
        return notice;
    }

    // Funciones globales
    window.addToFavorites = async function(placeId, name, type, lat, lng) {
        try {
            const response = await fetch('http://localhost:5000/api/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ placeId, name, type, lat, lng })
            });

            if (!response.ok) throw new Error('Error al guardar');
            
            showMapNotice('✔️ Añadido a favoritos', 'success');
            loadFavorites();
        } catch (err) {
            console.error('Error:', err);
            showMapNotice('Error al guardar favorito', 'error');
        }
    };

    window.removeFavorite = async function(favoriteId) {
        try {
            const response = await fetch(`http://localhost:5000/api/favorites/${favoriteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Error al eliminar');
            
            loadFavorites();
            showMapNotice('Favorito eliminado', 'success');
        } catch (err) {
            console.error('Error:', err);
            showMapNotice('Error al eliminar', 'error');
        }
    };

    async function loadFavorites() {
        if (!localStorage.getItem('token') || localStorage.getItem('token') === 'guest') {
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/favorites', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const favorites = await response.json();
            renderFavorites(favorites);
        } catch (err) {
            console.error('Error al cargar favoritos:', err);
            renderFavoritesError();
        }
    }

    function renderFavorites(favorites) {
        const container = document.getElementById('favoritesList');
        if (!container) return;
        
        if (!Array.isArray(favorites)) {
            container.innerHTML = '<li>Error al cargar favoritos</li>';
            return;
        }

        if (favorites.length === 0) {
            container.innerHTML = '<li>No tienes lugares favoritos aún</li>';
            return;
        }

        container.innerHTML = favorites.map(fav => `
            <li class="favorite-item" data-lat="${fav.lat}" data-lng="${fav.lng}">
                <span>${fav.name}</span>
                <button class="remove-favorite" data-id="${fav._id}">✕</button>
            </li>
        `).join('');
        
        // Eventos para los elementos
        document.querySelectorAll('.favorite-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                const lat = parseFloat(item.dataset.lat);
                const lng = parseFloat(item.dataset.lng);
                map.setView([lat, lng], 16);
            });
        });

        document.querySelectorAll('.remove-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.removeFavorite(btn.dataset.id);
            });
        });
    }

    function renderFavoritesError() {
        const container = document.getElementById('favoritesList');
        if (container) {
            container.innerHTML = '<li>Error al cargar favoritos</li>';
        }
    }
});
