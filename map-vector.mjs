// ==================================================================
// VECTOR MAP LAYERS DRAWING ROUTINES
// ------------------------------------------------------------------

import { fGID, fQS, fCSVGE, getJson, EARTH_TILT, MAX_COLOR_VALUE, DEGS_IN_CIRCLE, rad2Deg } from './globals.mjs';
import { LatLon } from './data-types.mjs';
import { MAP_VIEW_ORIGIN, MAP_WIDTH, MAP_HEIGHT, MAP_TILT_DEG,
         MAP_AREAS, project } from './concialdi.mjs';

// ------------------------------------------------------------------

let VectorMapIsInit = false;

// ------------------------------------------------------------------

export function initVectorMap() {
  if (VectorMapIsInit) return;
  VectorMapIsInit = true;
  fQS('svg').setAttribute('viewBox', `${-MAP_VIEW_ORIGIN.x} ${-MAP_VIEW_ORIGIN.y} ${MAP_WIDTH} ${MAP_HEIGHT}`);
  fGID('svg-map-wrapper').setAttribute('transform', `rotate(${MAP_TILT_DEG})`);
}

// ------------------------------------------------------------------

export function drawVectorMap() {
  initVectorMap();
  drawBackground();
  drawGraticule(5);
  drawSpecialCircles();
  drawCountries();
  drawStateBoundaries();
  drawBoundaries();
  // drawCities();
}

// ------------------------------------------------------------------

// Convert GeoJSON LineString or MultiPolygon coordinates to an SVG path,
// doing projection along the way
function convertGeoJsonToSvgPath(geoJson) {
  const isMultiPolygon = typeof geoJson[0][0][0] !== 'number';
  const path = fCSVGE('path');
  const lineStrings = isMultiPolygon ? [].concat(...geoJson) : geoJson;
  path.setAttribute(
    'd',
    lineStrings
      .map(lineString =>
        lineString
          .map(lonLat => project(new LatLon(lonLat[1], lonLat[0])))
          .map((point, idx) => (idx ? 'L' : 'M') + point.toString(3))
          .join('') + (isMultiPolygon ? 'z' : '')
      )
      .join(''),
  );
  return path;
}

// ------------------------------------------------------------------

// Convert a list of list of Point objects to an SVG path
function convertPointListsToSvgPath(pointLists, isClosed) {
  const path = fCSVGE('path');
  path.setAttribute(
    'd',
    pointLists
      .map(list =>
        list.map((point, idx) => (idx ? 'L' : 'M') + point.toString(3)).join('') +
        (isClosed ? 'z' : '')
      )
      .join(''),
  );
  return path;
}

// ------------------------------------------------------------------

const show_admin1 = ['USA', 'AUS', 'CAN'];

function drawCities() {
  getJson('ne_10m_populated_places_simple.json').then(cities => {
    cities.forEach(city => {
      if (city.properties.scalerank <= 2 || city.properties.featurecla === 'Admin-0 capital' || (city.properties.featurecla === 'Admin-1 capital' && show_admin1.includes(city.properties.adm0_a3))) {
        const location = project(new LatLon(city.geometry.coordinates[1], city.geometry.coordinates[0]));
        const group = fCSVGE('g');
        const dot = fCSVGE('circle');
        dot.setAttribute('cx', location.x);
        dot.setAttribute('cy', location.y);
        //dot.setAttribute('r', ((city.rank_max+6)/70).toString()+'px');
        dot.setAttribute('r', '.1px');
        group.appendChild(dot);

        const l2 = project(new LatLon(city.geometry.coordinates[1], city.geometry.coordinates[0]+1));
        const angle = rad2Deg(Math.atan2(l2.y-location.y, l2.x-location.x));

        const name = fCSVGE('text');
        name.setAttribute('x', location.x+.5);
        name.setAttribute('y', location.y+.3);
        name.setAttribute('transform', 'rotate(' + angle + ', ' + location.x +', ' + location.y + ')');
        name.innerHTML = city.properties.name;
        group.appendChild(name);

        fGID('cities').appendChild(group);
      }
    });
  });
}

function drawCountries() {
  getJson('ne_10m_admin_0_countries_lakes.json').then(countries => {
    countries.forEach(country => {
      const path = convertGeoJsonToSvgPath(country.geometry.coordinates);
      path.classList.add("c"+country.properties.MAPCOLOR7);
      // path.onmouseover = () => {
      //   fGID('annotation').innerHTML = country[0];
      // };

      // // Compute fill color based on the country's position
      // // where the average of the country's coordinates is a proxy for position
      // const flatLonLatList = [].concat(...[].concat(...country[1]));
      // const numCoords = flatLonLatList.length;
      // const sumLat = flatLonLatList.reduce((sum, lonLat) => sum + lonLat[1], 0);
      // const sumLon = flatLonLatList.reduce((sum, lonLat) => sum + lonLat[0], 0);
      // let red   = MAX_COLOR_VALUE/2 * (1 + sumLat / numCoords / (DEGS_IN_CIRCLE/4));
      // let green = MAX_COLOR_VALUE/2 * (1 + sumLon / numCoords / (DEGS_IN_CIRCLE/2));
      // let blue  = MAX_COLOR_VALUE - (red + green)/2;
      // red   = Math.min(MAX_COLOR_VALUE, red  *1.25);
      // green = Math.min(MAX_COLOR_VALUE, green*1.25);
      // blue  = Math.min(MAX_COLOR_VALUE, blue *1.25);
      // const rgb = `rgb(${red},${green},${blue})`;
      // path.setAttribute('fill'  , rgb);
      // path.setAttribute('stroke', rgb);

      fGID('countries').appendChild(path);
    });
  });
}

function drawStateBoundaries() {
  getJson('ne_10m_admin_1_states_provinces_lines.json').then(states => {
    states.forEach(state => {
      const adm0 = state.properties.ADM0_A3;
      if (show_admin1.includes(adm0)) {
        const path = convertGeoJsonToSvgPath(state.geometry.coordinates);
        fGID('state-boundaries').appendChild(path);
      }
    });
  });
  getJson('ne_10m_admin_0_boundary_lines_map_units_UK.json').then(states => {
    states.forEach(state => {
      const path = convertGeoJsonToSvgPath([state.geometry.coordinates]);
      //path.setAttribute('data', state.properties.NAME);
      fGID('state-boundaries').appendChild(path);
    });
  });
}

// ------------------------------------------------------------------

function drawBoundaries() {
  // ['Disputed (please verify)', 'Indefinite (please verify)', 'Indeterminant frontier', 'International boundary (verify)', 'Lease limit', 'Line of control (please verify)', 'Overlay limit', 'Unrecognized']
  getJson('ne_10m_admin_0_boundary_lines_land.json').then(boundaries => {
    boundaries.forEach(boundary => {
      if (boundary.properties.FEATURECLA === 'Lease limit' || boundary.properties.FEATURECLA === 'Overlay limit') return;
      const path = convertGeoJsonToSvgPath(boundary.geometry.coordinates);
      if (boundary.properties.FEATURECLA !== 'International boundary (verify)') path.classList.add('disputed');
      //path.setAttribute('data', boundary.properties.ADM0_A3_R+'-'+boundary.properties.ADM0_A3_L);
      // if (boundary.properties.FEATURECLA === 'Disputed (please verify)') {path.setAttribute('stroke', 'red');}
      // if (boundary.properties.FEATURECLA === 'Indefinite (please verify)') {path.setAttribute('stroke', 'blue');}
      // if (boundary.properties.FEATURECLA === 'Indeterminant frontier') {path.setAttribute('stroke', 'green');}
      // if (boundary.properties.FEATURECLA === 'International boundary (verify)') {path.setAttribute('stroke', 'black');}
      // if (boundary.properties.FEATURECLA === 'Lease limit') {path.setAttribute('stroke', 'purple');}
      // if (boundary.properties.FEATURECLA === 'Line of control (please verify)') {path.setAttribute('stroke', 'orange');}
      // if (boundary.properties.FEATURECLA === 'Overlay limit') {path.setAttribute('stroke', 'yellow');}
      // if (boundary.properties.FEATURECLA === 'Unrecognized') {path.setAttribute('stroke', 'hotpink');}
      fGID('boundaries').appendChild(path);
    });
  });
}

// ------------------------------------------------------------------

// Graticule interval values in degrees
const DEFAULT_INTERVAL = 15;
const VALID_INTERVALS = [1, 2, 5, 10, 15, 20, 30];

export function drawGraticule(interval = DEFAULT_INTERVAL) {

  if (!VALID_INTERVALS.includes(interval)) interval = DEFAULT_INTERVAL;

  const pointLists = [];
  MAP_AREAS.forEach((area, idx) => {

    let points;

    let endLon = area.neCorner.lon;
    if (area.hasAntimeridian) endLon += DEGS_IN_CIRCLE;

    // Generate latitude lines
    for (
      let lat = Math.ceil (area.swCorner.lat/interval)*interval;
      lat <=    Math.floor(area.neCorner.lat/interval)*interval;
      lat += interval
    ) {
      if (lat === 0) continue; // Handle the equator elsewhere
      points = [];
      for (let lon = area.swCorner.lon; lon <= endLon; lon++) {
        points.push(project(new LatLon(lat, lon), idx));
      }
      if (area.swCorner.lon % 1 !== endLon % 1) {
        // Account for the half-degree cut along the Bering Strait
        points.push(project(new LatLon(lat, endLon), idx));
      }
      pointLists.push(points);
    }

    // Generate longitude lines
    for (
      let lon = Math.ceil (area.swCorner.lon/interval)*interval;
      lon <=    Math.floor(endLon           /interval)*interval;
      lon += interval
    ) {
      points = [];
      for (let lat = Math.max(lon%10===0?(lon%20===0?-90:-85):-80, area.swCorner.lat); lat <= Math.min(lon%10===0?(lon%20===0?90:85):80, area.neCorner.lat); lat++) {
        points.push(project(new LatLon(lat, lon), idx));
      }
      pointLists.push(points);
    }
  });

  // Draw graticule
  const path = convertPointListsToSvgPath(pointLists, false);
  fGID('graticule').appendChild(path);
}

// ------------------------------------------------------------------

// Draws the equator, tropic circles, and polar circles
export function drawSpecialCircles() {

  let pointLists;
  let points;
  let path, path2;

  // Generate equator
  pointLists = [];
  points = [];
  points.push(project(MAP_AREAS[0].swCorner));
  points.push(project(MAP_AREAS[1].swCorner));
  points.push(project(MAP_AREAS[2].swCorner));
  points.push(project(MAP_AREAS[3].swCorner));
  points.push(project(MAP_AREAS[4].swCorner));
  points.push(project(MAP_AREAS[0].swCorner, 4));
  pointLists.push(points);
  points = [];
  points.push(project(new LatLon(0, MAP_AREAS[5].swCorner.lon), 5));
  points.push(project(MAP_AREAS[5].neCorner));
  pointLists.push(points);
  points = [];
  points.push(project(MAP_AREAS[4].swCorner));
  points.push(project(MAP_AREAS[11].neCorner, 11));
  pointLists.push(points);

  // Draw equator
  path = convertPointListsToSvgPath(pointLists, false);
  path2 = convertPointListsToSvgPath(pointLists, false);
  path.classList.add('equator');
  fGID('circles').appendChild(path);
  fGID('equator-mask').appendChild(path2);

  pointLists = [];

  // Generate Tropic of Cancer and Arctic Circle
  [EARTH_TILT, DEGS_IN_CIRCLE/4 - EARTH_TILT].forEach(lat => {
    points = [project(new LatLon(lat, MAP_AREAS[0].swCorner.lon))];
    for (let lon = Math.trunc(MAP_AREAS[0].swCorner.lon); lon < MAP_AREAS[4].neCorner.lon + DEGS_IN_CIRCLE; lon++) {
      points.push(project(new LatLon(lat, lon)));
    }
    points.push(project(new LatLon(lat, MAP_AREAS[4].neCorner.lon), 4));
    pointLists.push(points);
  });

  // Generate Tropic of Capricorn
  points = [];
  for (let lon = MAP_AREAS[5].swCorner.lon; lon <= MAP_AREAS[6].neCorner.lon; lon++) {
    points.push(project(new LatLon(-EARTH_TILT, lon)));
  }
  pointLists.push(points);
  points = [];
  for (let lon = MAP_AREAS[8].swCorner.lon; lon <= MAP_AREAS[8].neCorner.lon; lon++) {
    points.push(project(new LatLon(-EARTH_TILT, lon), 8));
  }
  pointLists.push(points);
  points = [];
  for (let lon = MAP_AREAS[10].swCorner.lon; lon <= MAP_AREAS[11].neCorner.lon + DEGS_IN_CIRCLE; lon++) {
    points.push(project(new LatLon(-EARTH_TILT, lon), points.length === 0 ? 10 : undefined));
  }
  pointLists.push(points);

  // Generate Antarctic Circle
  points = [];
  for (let lon = MAP_AREAS[5].swCorner.lon; lon <= MAP_AREAS[7].neCorner.lon; lon++) {
    points.push(project(new LatLon(-DEGS_IN_CIRCLE/4 + EARTH_TILT, lon)));
  }
  pointLists.push(points);
  points = [];
  for (let lon = MAP_AREAS[9].swCorner.lon; lon <= MAP_AREAS[11].neCorner.lon + DEGS_IN_CIRCLE; lon++) {
    points.push(project(new LatLon(-DEGS_IN_CIRCLE/4 + EARTH_TILT, lon), points.length === 0 ? 9 : undefined));
  }
  pointLists.push(points);

  // Draw tropic and polar circles
  path = convertPointListsToSvgPath(pointLists, false);
  path.classList.add('polar-tropic');
  fGID('circles').appendChild(path);
}

// ------------------------------------------------------------------

// Draw the map background/outline
function drawBackground() {

  // Generate background points
  const points = [];
  points.push(project(new LatLon(MAP_AREAS[5].neCorner.lat, MAP_AREAS[5].swCorner.lon), 5));
  for (let lat = 0; lat >= -DEGS_IN_CIRCLE/4; lat--) {
    points.push(project(new LatLon(lat, MAP_AREAS[5].swCorner.lon), 5));
  }
  for (let lon = MAP_AREAS[7].neCorner.lon; lon >= MAP_AREAS[7].swCorner.lon; lon--) {
    points.push(project(new LatLon(MAP_AREAS[7].neCorner.lat, lon)));
  }
  points.push(project(MAP_AREAS[6].neCorner, 6));
  for (let lon = MAP_AREAS[8].swCorner.lon; lon <= MAP_AREAS[8].neCorner.lon; lon++) {
    points.push(project(new LatLon(MAP_AREAS[8].swCorner.lat, lon), 8));
  }
  points.push(project(MAP_AREAS[8].neCorner));
  for (let lon = MAP_AREAS[9].neCorner.lon; lon >= MAP_AREAS[9].swCorner.lon; lon--) {
    points.push(project(new LatLon(MAP_AREAS[9].neCorner.lat, lon), 9));
  }
  for (let lat = -DEGS_IN_CIRCLE/4; lat <= 0; lat++) {
    points.push(project(new LatLon(lat, MAP_AREAS[11].neCorner.lon), 11));
  }
  points.push(project(MAP_AREAS[10].neCorner));
  for (let lat = 0; lat < DEGS_IN_CIRCLE/4; lat++) {
    points.push(project(new LatLon(lat, MAP_AREAS[4].neCorner.lon), 4));
  }
  for (let lat = DEGS_IN_CIRCLE/4; lat >= 0; lat--) {
    points.push(project(new LatLon(lat, MAP_AREAS[0].swCorner.lon)));
  }
  points.push(project(MAP_AREAS[5].neCorner));

  // Draw background
  fGID('background').setAttribute(
    'd',
    points.map((point, idx) => (idx ? 'L' : 'M') + point.toString(3)).join(''),
  );
}
