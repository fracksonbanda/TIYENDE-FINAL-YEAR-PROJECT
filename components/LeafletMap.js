import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

// Keyless OpenStreetMap replacement for react-native-maps.
// react-native-maps needs a Google Maps API key on Android even when the
// tiles themselves are OpenStreetMap, because the native module wraps
// Google's Maps SDK. This renders Leaflet + OSM tiles inside a WebView
// instead, so no API key is required from anyone, on any platform.

function regionToZoom(region) {
  const delta = Math.max(region?.latitudeDelta || 0.05, 0.0005);
  const z = Math.round(Math.log2(360 / delta)) - 1;
  return Math.min(18, Math.max(3, z));
}

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #e9edf0; }
  .ty-dot { width: 22px; height: 22px; border-radius: 11px; background: rgba(26,107,58,0.22); display: flex; align-items: center; justify-content: center; }
  .ty-dot-inner { width: 12px; height: 12px; border-radius: 6px; background: #1A6B3A; border: 2px solid #fff; }
  .ty-badge { width: 30px; height: 30px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.35); border: 2px solid #fff; }
  .ty-pin { font-size: 30px; line-height: 30px; }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: true })
    .setView([-15.3875, 28.3228], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  var markerLayer = L.layerGroup().addTo(map);
  var lineLayer = L.layerGroup().addTo(map);

  function iconFor(m) {
    if (m.type === 'dot') {
      return L.divIcon({ className: '', html: '<div class="ty-dot"><div class="ty-dot-inner"></div></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
    }
    if (m.type === 'pin') {
      return L.divIcon({ className: '', html: '<div class="ty-pin">\u{1F4CD}</div>', iconSize: [30, 30], iconAnchor: [15, 30] });
    }
    var bg = m.color || '#1A6B3A';
    return L.divIcon({ className: '', html: '<div class="ty-badge" style="background:' + bg + '">' + (m.emoji || '') + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
  }

  window.tyUpdate = function (p) {
    markerLayer.clearLayers();
    lineLayer.clearLayers();
    (p.markers || []).forEach(function (m) {
      if (!m || !m.coordinate) return;
      L.marker([m.coordinate.latitude, m.coordinate.longitude], { icon: iconFor(m) }).addTo(markerLayer);
    });
    if (p.polyline && p.polyline.coordinates && p.polyline.coordinates.length > 1) {
      var pts = p.polyline.coordinates.map(function (c) { return [c.latitude, c.longitude]; });
      L.polyline(pts, { color: p.polyline.color || '#1A6B3A', weight: 4, dashArray: '8,6' }).addTo(lineLayer);
    }
    if (p.region) {
      map.setView([p.region.latitude, p.region.longitude], p.zoom || 13, { animate: true });
    }
    if (p.scrollEnabled) { map.dragging.enable(); } else { map.dragging.disable(); }
    if (p.zoomEnabled) {
      map.scrollWheelZoom.enable(); map.touchZoom.enable(); map.doubleClickZoom.enable();
    } else {
      map.scrollWheelZoom.disable(); map.touchZoom.disable(); map.doubleClickZoom.disable();
    }
  };
</script>
</body>
</html>`;

export default function LeafletMap({ style, region, markers = [], polyline = null, scrollEnabled = true, zoomEnabled = true }) {
  const webRef = useRef(null);
  const readyRef = useRef(false);

  const payload = useMemo(() => ({
    markers: markers.filter((m) => m && m.coordinate),
    polyline: polyline && polyline.coordinates && polyline.coordinates.length > 1 ? polyline : null,
    region,
    zoom: regionToZoom(region),
    scrollEnabled,
    zoomEnabled,
  }), [markers, polyline, region, scrollEnabled, zoomEnabled]);

  const send = () => {
    if (!webRef.current) return;
    webRef.current.injectJavaScript(`window.tyUpdate && window.tyUpdate(${JSON.stringify(payload)}); true;`);
  };

  useEffect(() => {
    if (readyRef.current) send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return (
    <View style={style}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: HTML }}
        onLoadEnd={() => { readyRef.current = true; send(); }}
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        androidLayerType="hardware"
      />
    </View>
  );
}
