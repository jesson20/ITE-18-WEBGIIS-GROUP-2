import { useEffect, useRef, useState } from 'react';

const provinces = {
  'All mangroves': null,
  Palawan: [118.735, 9.834],
  Quezon: [121.847, 14.039],
  'Camarines Sur': [123.272, 13.525],
  'Zamboanga del Sur': [123.258, 7.838],
  'Misamis Occidental': [123.774, 8.337],
};

const heroPhotos = [
  {
    src: '/images/hero_mangrove.png',
    alt: 'Emerald Philippine mangrove sanctuary with crystal clear waters',
    location: 'Palawan Archipelago · Philippines',
    tag: 'Coastal Ecosystem Sanctuary',
    stat: 'Vibrant Canopy',
  },
  {
    src: '/images/Palawan_Mangrove.JPG',
    alt: 'Dense Palawan mangrove forest and root network',
    location: 'Palawan Province · 58,400+ Ha',
    tag: 'Largest Cover in PH',
    stat: '31+ Native Species',
  },
  {
    src: '/images/Camarines_Sur.jpg',
    alt: 'Camarines Sur coastal mangrove shoreline',
    location: 'Camarines Sur · Bicol Region',
    tag: 'Natural Wave Barrier',
    stat: '30,000+ Hectares',
  },
  {
    src: '/images/Quezon.png',
    alt: 'Quezon province mangrove conservation area',
    location: 'Quezon Province · Southern Luzon',
    tag: 'Biodiversity Refuge',
    stat: 'Community Protected',
  },
];

function Logo() {
  return <a className="brand" href="#home" aria-label="Mangrove Map home"><span className="brand-mark" aria-hidden="true">M</span><span>Mangrove<br /><b>Map</b></span></a>;
}

export default function App() {
  const mapFrame = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [activeProvince, setActiveProvince] = useState('All mangroves');
  const [opacity, setOpacity] = useState(100);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextPhoto = () => {
    setCurrentPhotoIdx((prev) => (prev + 1) % heroPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIdx((prev) => (prev - 1 + heroPhotos.length) % heroPhotos.length);
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentPhotoIdx((prev) => (prev + 1) % heroPhotos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const sendToMap = (message) => mapFrame.current?.contentWindow?.postMessage(message, window.location.origin);

  const moveTo = (place, keepResults = false) => {
    sendToMap({ type: 'zoomTo', longitude: Number(place.lon), latitude: Number(place.lat), label: place.display_name });
    setSearchStatus(`Showing ${place.display_name}`);
    if (!keepResults) setResults([]);
  };

  async function searchPlace(event) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setSearchStatus('Searching places in the Philippines...');
    setResults([]);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent(value)}`);
      if (!response.ok) throw new Error('Search service unavailable');
      const places = await response.json();
      if (!places.length) {
        setSearchStatus('No Philippine location found. Try a city, province, or municipality.');
        return;
      }
      setResults(places);
      moveTo(places[0], true);
    } catch {
      setSearchStatus('Place search is unavailable. Check your internet connection and try again.');
    }
  }

  function selectProvince(province) {
    setActiveProvince(province);
    sendToMap({ type: 'filterProvince', province: provinces[province] ? province : null });
    if (provinces[province]) sendToMap({ type: 'zoomTo', longitude: provinces[province][0], latitude: provinces[province][1], label: province });
  }

  function updateOpacity(event) {
    const value = Number(event.target.value);
    setOpacity(value);
    sendToMap({ type: 'setOpacity', opacity: value / 100 });
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setSearchStatus('Your browser does not support location services.');
      return;
    }
    setSearchStatus('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        sendToMap({ type: 'zoomTo', longitude: coords.longitude, latitude: coords.latitude, label: 'Your location', isUserLocation: true });
        setSearchStatus('Showing your location.');
      },
      () => setSearchStatus('Location permission was not granted.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Logo />
        <nav className="tabs" aria-label="Page sections"><a href="#home">Home</a><a href="#explore">Explore</a><a href="#about">About</a></nav>
        <a className="header-action" href="#explore">Open map <span aria-hidden="true">↗</span></a>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow">Web GIS Project · Philippines</p>
            <h1>See where our <em className="gradient-text">mangroves</em> thrive.</h1>
            <p className="lead">A living map of Philippine mangrove ecosystems — built to make coastal habitats easier to discover, understand, and protect.</p>
            
            <div className="hero-quick-stats">
              <div className="quick-stat-chip">
                <span className="stat-num">500,000+</span>
                <span className="stat-desc">Hectares Protected</span>
              </div>
              <div className="quick-stat-chip">
                <span className="stat-num">35+</span>
                <span className="stat-desc">Native Species</span>
              </div>
              <div className="quick-stat-chip">
                <span className="stat-num">7,000+</span>
                <span className="stat-desc">Islands Mapped</span>
              </div>
            </div>

            <div className="hero-actions">
              <a className="button primary-btn" href="#explore">Explore the map <span aria-hidden="true">↓</span></a>
              <a className="text-link" href="#about">About the project</a>
            </div>
          </div>

          <div className="hero-showcase">
            <div className="hero-glow-backdrop" aria-hidden="true" />
            <div
              className={`hero-card ${isPaused ? 'is-paused' : ''}`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="hero-live-pill">
                <span className={`pulsing-dot ${isPaused ? 'paused' : ''}`} />
                <span>{isPaused ? 'Carousel Paused' : 'Philippine Shoreline GIS'}</span>
              </div>

              <div className="hero-image-frame">
                <img
                  key={heroPhotos[currentPhotoIdx].src}
                  src={heroPhotos[currentPhotoIdx].src}
                  alt={heroPhotos[currentPhotoIdx].alt}
                  className="hero-main-photo fade-in"
                />
                <div className="hero-image-overlay" />

                <button
                  type="button"
                  className="carousel-arrow arrow-left"
                  onClick={prevPhoto}
                  aria-label="Previous photo"
                  title="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-arrow arrow-right"
                  onClick={nextPhoto}
                  aria-label="Next photo"
                  title="Next photo"
                >
                  ›
                </button>

                <div className="hero-gallery-nav" aria-label="Photo carousel navigation">
                  {heroPhotos.map((photo, idx) => (
                    <button
                      key={photo.src}
                      type="button"
                      className={`gallery-dot ${idx === currentPhotoIdx ? 'active' : ''}`}
                      onClick={() => setCurrentPhotoIdx(idx)}
                      aria-label={`View photo ${idx + 1}: ${photo.location}`}
                      title={photo.location}
                    />
                  ))}
                </div>

                <div className="hero-caption-card">
                  <div className="caption-header">
                    <span className="caption-dot" />
                    <span className="caption-tag">{heroPhotos[currentPhotoIdx].tag}</span>
                  </div>
                  <p className="caption-location">{heroPhotos[currentPhotoIdx].location}</p>
                </div>
              </div>

              <div className="hero-badge-stat">
                <span className="stat-value">{heroPhotos[currentPhotoIdx].stat}</span>
                <span className="stat-label">Verified Coastal Zone</span>
              </div>
            </div>
          </div>
        </section>

        <section className="impact-strip" aria-label="Mangrove benefits">
          <div>
            <svg className="impact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div>
              <strong>Coastal Defense</strong>
              <span>Natural protection from waves and storm surge</span>
            </div>
          </div>
          <div>
            <svg className="impact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22a9 9 0 0 1-9-9c0-5 9-11 9-11s9 6 9 11a9 9 0 0 1-9 9z"/><path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
            <div>
              <strong>Living Habitat</strong>
              <span>Nurseries for fish, birds, and marine life</span>
            </div>
          </div>
          <div>
            <svg className="impact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
            <div>
              <strong>Climate Ally</strong>
              <span>Carbon stored in trees and coastal soils</span>
            </div>
          </div>
        </section>

        <section className="purpose-section">
          <div className="purpose-heading">
            <p className="eyebrow">Why Protect Mangroves?</p>
            <h2>They are more than trees at the water’s edge.</h2>
            <p>Mangrove forests quietly support the lives of coastal communities every day. Protecting them means protecting people, wildlife, and the future of our shorelines.</p>
          </div>
          <div className="purpose-cards">
            <article className="purpose-card">
              <div className="card-top">
                <span className="card-number">01</span>
                <svg className="purpose-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>They protect communities.</h3>
              <p>Dense roots slow waves, hold soil in place, and help reduce coastal erosion and the impact of storm surges.</p>
            </article>
            <article className="purpose-card">
              <div className="card-top">
                <span className="card-number">02</span>
                <svg className="purpose-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10Z"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <h3>They support food and livelihoods.</h3>
              <p>Mangroves are safe nurseries for fish, crabs, shrimp, and other marine species that support local fisheries.</p>
            </article>
            <article className="purpose-card">
              <div className="card-top">
                <span className="card-number">03</span>
                <svg className="purpose-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M19 12A7 7 0 0 0 5 12"/></svg>
              </div>
              <h3>They shelter biodiversity.</h3>
              <p>Birds, reptiles, fish, and countless smaller organisms depend on these forests for feeding, breeding, and refuge.</p>
            </article>
            <article className="purpose-card">
              <div className="card-top">
                <span className="card-number">04</span>
                <svg className="purpose-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
              </div>
              <h3>They help the climate.</h3>
              <p>Mangroves capture carbon in their trunks, roots, and waterlogged soils, making healthy forests valuable climate allies.</p>
            </article>
          </div>
        </section>

        <section className="action-section">
          <div className="action-backdrop-glow" aria-hidden="true" />
          <div className="action-header-wrap">
            <p className="eyebrow">A Shared Responsibility</p>
            <h2>Healthy coasts begin with healthy mangroves.</h2>
          </div>
          <div className="action-copy">
            <p>Mangrove forests can be harmed by land conversion, pollution, unsustainable harvesting, and changing coastlines. Awareness is a first step: know where mangroves grow, respect protected areas, and support restoration led by local communities.</p>
            <ul className="action-list">
              <li><span>Explore the map and learn what grows near your coast.</span></li>
              <li><span>Dispose of waste properly and reduce plastic reaching waterways.</span></li>
              <li><span>Support community-led conservation and responsible ecotourism.</span></li>
            </ul>
          </div>
        </section>

        <section className="map-section" id="explore">
          <div className="section-intro">
            <div>
              <p className="eyebrow">Interactive Explorer</p>
              <h2>Find a place. Explore its mangroves.</h2>
            </div>
            <p>Search for a Philippine city or municipality, filter the mangrove layer by province, and switch between street and satellite views.</p>
          </div>

          <div className="map-dashboard-bar">
            <div className="map-tools">
              <form className="search-box" onSubmit={searchPlace}>
                <label htmlFor="place-search">Search a city or place</label>
                <div className="search-input-wrap">
                  <input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Butuan City or Palawan" />
                  <button type="submit" className="search-submit-btn">Search</button>
                </div>
              </form>
              <button className="locate-button" type="button" onClick={locateMe}>
                <span aria-hidden="true">◎</span> Use my location
              </button>
              <div className="opacity-control">
                <label htmlFor="mangrove-opacity">Mangrove layer opacity <b>{opacity}%</b></label>
                <input id="mangrove-opacity" type="range" min="0" max="100" value={opacity} onChange={updateOpacity} />
              </div>
            </div>

            {searchStatus && <p className="search-status" role="status">{searchStatus}</p>}
            {results.length > 1 && (
              <div className="search-results" aria-label="Place search results">
                {results.slice(1).map((place) => (
                  <button type="button" key={`${place.place_id}`} onClick={() => moveTo(place)}>
                    📍 {place.display_name}
                  </button>
                ))}
              </div>
            )}

            <div className="filter-row">
              <span className="filter-label">Filter Layer:</span>
              {Object.keys(provinces).map((province) => (
                <button
                  type="button"
                  className={activeProvince === province ? 'selected' : ''}
                  key={province}
                  onClick={() => selectProvince(province)}
                >
                  {province}
                </button>
              ))}
            </div>
          </div>

          <div className="map-wrap">
            <iframe ref={mapFrame} className="map-frame" title="Interactive Philippine mangrove map" src="/map-view.html" />
            <aside className="map-legend">
              <span className="legend-title">Map Guide</span>
              <p><i className="mangrove-key" /> Mangrove Coverage</p>
              <p><i className="marker-key" /> Searched Location</p>
              <small>Click the map’s feature-info tool, then a mangrove area, to inspect its details.</small>
            </aside>
          </div>
        </section>

        <section className="about-section" id="about">
          <div>
            <p className="eyebrow">About This Project</p>
            <h2>Data that makes the coastline visible.</h2>
          </div>
          <div className="about-copy">
            <p>The Philippine Mangrove Forest is a Web GIS project that combines an OpenLayers map, a bundled mangrove GeoJSON dataset, and a React interface to make mangrove information accessible.</p>
            <p>Use the map to view mangrove coverage, inspect feature attributes, measure distances or areas, and compare the layer with satellite imagery.</p>
            
            <div className="creator-card">
              <div className="avatar-ring">
                <img src="/images/jessonID_PICTURE.jpeg" alt="Jesson Maurice Antiporda" />
              </div>
              <div className="creator-details">
                <span className="creator-label">Project Developer</span>
                <strong>Jesson Maurice Antiporda</strong>
                <small>Caraga State University · Web GIS Group 2</small>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer><Logo /><span>Philippine Mangrove Forest · Web GIS project</span><a href="#home">Back to top ↑</a></footer>
    </div>
  );
}
