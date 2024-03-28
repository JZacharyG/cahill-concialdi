// ==================================================================
// VECTOR MAP LAYERS DRAWING ROUTINES
// ------------------------------------------------------------------

import { fGID, fQS, fCSVGE, getJson, EARTH_TILT, MAX_COLOR_VALUE, DEGS_IN_CIRCLE, rad2Deg, deg2Rad } from './globals.mjs';
import { LatLon, Point } from './data-types.mjs';
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
  drawCountries(true, true);
  drawStateBoundaries();
  drawStateLabels();
  drawBoundaries();
  drawDisputedBoundaries();
  drawCities(true);
  //drawCoastline();
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

const admin0_show_admin1 = ['USA', 'AUS', 'CAN'];//, 'MEX', 'BRA', 'RUS'];
const admin0_hide_cities = [
  'SVN', // Slovenia
  'HRV', // Croatia
  'ALB', // Albania
  'BIH', // Bosnia and Herzegovina
  'MNE', // Montenegro
  'KOS', // Kosovo
  'MKD', // North Macedonia
  'LIE', // Liechtenstein
  'ATG', // Antigua and Barbuda
  'KNA', // Saint Kitts and Nevis
  'LCA', // Saint Lucia
  'DMA', // Dominica
  'VCT', // Saint Vincent and the Grenadines
  'BRB', // Barbados
  'GRD', // Grenada
  'CYP', // Cyprus
  'MLT', // Malta
  'MUS', // Mauritius
  'SYC', // Seychelles
  'COM', // Comoros
  'LUX', // Luxembourg
  'MCO', // Monaco
  'SMR', // San Marino
  'AND', // Andorra
  'VAT', // Vatican
  'STP', // Sao Tome and Principe
  'TUV', // Tuvalu
  'KIR', // Kiribati
  'BMU', // Bermuda
  'GIB', // Gibraltar
  ];

function drawCities(labels = true) {
  getJson('ne_10m_populated_places_simple.json').then(cities => {
    cities.forEach(city => {
      if (['Singapore', 'Hong Kong'].includes(city.properties.name)) return; // could handle this better...
      if (!admin0_hide_cities.includes(city.properties.adm0_a3) && city.properties.label_size !== 0 && (
          city.properties.min_zoom <= 5.1 // 5.1 or 5.6 seems right, depending on the place, 6 is definitely too much
          || city.properties.featurecla === 'Admin-0 capital'
          //|| (city.properties.featurecla === 'Admin-1 capital' && admin0_show_admin1.includes(city.properties.adm0_a3))
          || [
              'Smolensk', // Cousins from here! (covered at zoom 5.1)
              'Longyearbyen', // Northernmost settlement with a permanent population over 1,000
              // 'Hammerfest', // Northernmost settlement with a permanent population over 10,000 (covered at zoom 5.1)
             ].includes(city.properties.name))) {
        const location = project(new LatLon(city.geometry.coordinates[1], city.geometry.coordinates[0]));
        const dot = fCSVGE('circle');
        dot.setAttribute('cx', location.x);
        dot.setAttribute('cy', location.y);
        //dot.setAttribute('r', ((city.rank_max+6)/70).toString()+'px');
        dot.setAttribute('r', '.1px');
        if (city.properties.featurecla === 'Admin-0 capital')
          dot.classList.add('capital');

        if (labels) {
          const l2 = project(new LatLon(city.geometry.coordinates[1], city.geometry.coordinates[0]+1));
          const angle = rad2Deg(Math.atan2(l2.y-location.y, l2.x-location.x));
          const group = fCSVGE('g');
          const name = fCSVGE('text');
          const label_anchor = city.properties.label_anchor;

          switch (label_anchor) {
            case 'E':
              name.setAttribute('x', location.x + city.properties.label_dx + 0.25);
              name.setAttribute('y', location.y - city.properties.label_dy + 0.15);
              break;
            case 'W':
              name.setAttribute('x', location.x + city.properties.label_dx - 0.25);
              name.setAttribute('y', location.y - city.properties.label_dy + 0.15);
              name.classList.add('right-align');
              break;
            case 'N':
              name.setAttribute('x', location.x + city.properties.label_dx);
              name.setAttribute('y', location.y - city.properties.label_dy - 0.2);
              name.classList.add('center-align');
              break;
            case 'S':
              name.setAttribute('x', location.x + city.properties.label_dx);
              name.setAttribute('y', location.y - city.properties.label_dy + 0.6);
              name.classList.add('center-align');
              break;
          }

          name.setAttribute('transform', 'rotate(' + (angle - city.properties.label_angle) + ', ' + location.x +', ' + location.y + ')');
          name.innerHTML = city.properties.name;

          group.appendChild(dot);
          group.appendChild(name);
          fGID('cities').appendChild(group);
        } else {
          fGID('cities').appendChild(dot);
        }
      }
    });
  });
}

function drawRegionLabels(data, destination_id, font_size, display_filter, name_map=(x => {return x.properties.name;})) {
  data.forEach(region => {
    if (region.properties.label_size !== 0 && display_filter(region)) {
      const location = project(new LatLon(region.properties.label_y, region.properties.label_x));
      const l2 = project(new LatLon(region.properties.label_y, region.properties.label_x+1));
      const angle = rad2Deg(location.getAngleTo(l2));
      const name = name_map(region);
      const label = fCSVGE('text');

      if (region.properties.label_bend_width !== undefined) {
        let points = [];
        const lat = region.properties.label_y;
        for (
          let lon = region.properties.label_x - region.properties.label_bend_width;
          lon <= region.properties.label_x + region.properties.label_bend_width;
          lon += 0.5
        ) {
          points.push(project(new LatLon(lat,lon)));
        }
        const label_path = convertPointListsToSvgPath([points], false);
        label_path.setAttribute('id', region.properties.ne_id+'-label-path');
        label_path.setAttribute('style', 'fill:none');
        fGID(destination_id).appendChild(label_path);

        const label_inner = fCSVGE('textPath');
        label_inner.setAttribute('href', '#'+region.properties.ne_id+'-label-path');
        label_inner.innerHTML = name;
        label_inner.setAttribute('startOffset', '50%');
        label.appendChild(label_inner);
        label.setAttribute('style','font-size:' + (font_size*region.properties.label_size/100) + 'px;');

        fGID(destination_id).appendChild(label);
      } else {
        label.setAttribute('x', location.x);
        label.setAttribute('y', location.y + font_size*region.properties.label_size/100*.3);
        label.setAttribute('transform', 'rotate(' + (angle - region.properties.label_angle) + ', ' + location.x +', ' + location.y + ')');
        label.setAttribute('style','font-size:' + (font_size*region.properties.label_size/100) + 'px;');
        if (name.includes('\n')) {
          name.split('\n').forEach((line, idx) => {
            const label_tspan = fCSVGE('tspan');
            label_tspan.setAttribute('x', location.x);
            if (idx)
              label_tspan.setAttribute('dy', font_size*region.properties.label_size/100);
            label_tspan.innerHTML = line;
            label.appendChild(label_tspan);
          });
        } else {
          label.innerHTML = name;
        }

        fGID(destination_id).appendChild(label);

        if (region.properties.line_to !== undefined) {
          const other_end = project(new LatLon(region.properties.line_to[1], region.properties.line_to[0]));
          let anchor = region.properties.line_anchor;
          const label_bbox = label.getBBox();
          if (anchor === undefined) {
            const label_center = new Point(label_bbox.x+label_bbox.width/2, label_bbox.y+label_bbox.height/2);
            label_center.translate(location.copy().scale(-1)).rotate(deg2Rad(angle - region.properties.label_angle)).translate(location);
            const angle_to = rad2Deg(label_center.getAngleTo(other_end)) - (angle - region.properties.label_angle);
            anchor = [0,50];
            if (45 < angle_to && angle_to < 135)
              anchor = [50,0];// = new Point(label_bbox.x+label_bbox.width/2, label_bbox.y+label_bbox.height);
            if (-45 > angle_to && angle_to > -135)
              anchor = [50,100];// = new Point(label_bbox.x+label_bbox.width/2, label_bbox.y);
            if (-45 <= angle_to && angle_to <= 45)
              anchor = [100,50];// = new Point(label_bbox.x+label_bbox.width, label_bbox.y+label_bbox.height/2);
          }
          let anchor_point = new Point(label_bbox.x+anchor[0]*label_bbox.width/100, label_bbox.y+(100-anchor[1])*label_bbox.height/100);
          anchor_point.translate(location.copy().scale(-1)).rotate(deg2Rad(angle - region.properties.label_angle)).translate(location);

          const label_line = fCSVGE('line');
          label_line.setAttribute('x1', anchor_point.x);
          label_line.setAttribute('y1', anchor_point.y);
          label_line.setAttribute('x2', other_end.x);
          label_line.setAttribute('y2', other_end.y);
          fGID('state-labels').appendChild(label_line);
        }
      }
    }
  });
}

function drawCountries(regions = true, labels = true) {
  getJson('ne_10m_admin_0_countries_lakes.json').then(countries => {
    countries.forEach(country => {
      if (regions) {
        const path = convertGeoJsonToSvgPath(country.geometry.coordinates);
        path.classList.add("c"+country.properties.mapcolor7);
        fGID('countries').appendChild(path);
      }
    });
    if (labels) {
      drawRegionLabels(countries, 'country-labels', 1,
        country => {
          return ['Sovereign country', 'Sovereignty', 'Disputed', 'Dependency'].includes(country.properties.type)
            || country.properties.type === 'Country' && (country.properties.name === country.properties.sovereignt)
            || [
                'ATA', // Antarctica
                'SAH', // Western Sahara
                'SXM', // Sint Maarten
                'HKG', // Hong Kong
                'GRL', // Greenland
                'CUW', // Curaçao
                'ABW', // Aruba
              ].includes(country.properties.adm0_a3);
        }
      );
    }
  });
}

function drawStateLabels() {
  getJson('ne_10m_admin_1_states_provinces_lakes.json').then(states => {
    drawRegionLabels(states, 'state-labels', 1,
      state => {
        const adm0 = state.properties.adm0_a3;
        if (adm0 === 'AUS' && state.properties.type !== 'State' && ![
              'AU.AC', // Australian Capital Territory
              'AU.NT', // Northern Terrirory (Australia)
            ].includes(state.properties.code_hasc)) return false;
        if (state.properties.postal === 'DC') return false;
        return admin0_show_admin1.includes(adm0) && state.properties.name !== null
          || state.properties.type_en === 'Overseas department'
          || [
              'PT.AC', // Azores
            ].includes(state.properties.code_hasc);
      },
      state => {
        return state.properties.adm0_a3 === 'USA'?state.properties.postal:state.properties.name;
      }
    );
  });
  getJson('ne_10m_admin_0_map_units_UK.json').then(states => {
    drawRegionLabels(states, 'state-labels', 1,
      state => { return state.properties.type === 'Geo unit'; }
    );
  });
}

function drawStateBoundaries() {
  getJson('ne_10m_admin_1_states_provinces_lines.json').then(states => {
    states.forEach(state => {
      const adm0 = state.properties.adm0_a3;
      if (admin0_show_admin1.includes(adm0)) {
        const path = convertGeoJsonToSvgPath(state.geometry.coordinates);
        fGID('state-boundaries').appendChild(path);
      }
    });
  });
  getJson('ne_10m_admin_0_boundary_lines_map_units_UK.json').then(states => {
    states.forEach(state => {
      const path = convertGeoJsonToSvgPath([state.geometry.coordinates]);
      //path.setAttribute('data', state.properties.name);
      fGID('state-boundaries').appendChild(path);
    });
  });
}

// ------------------------------------------------------------------

function drawCoastline() {
  getJson('ne_10m_coastline.json').then(components => {
    components.forEach(component => {
      const path = convertGeoJsonToSvgPath(component.geometry.coordinates);
      fGID('coastline').appendChild(path);
    });
  });
}


function drawBoundaries() {
  // ['Disputed (please verify)', 'Indefinite (please verify)', 'Indeterminant frontier', 'International boundary (verify)', 'Lease limit', 'Line of control (please verify)', 'Overlay limit', 'Unrecognized']
  getJson('ne_10m_admin_0_boundary_lines_land.json').then(boundaries => {
    boundaries.forEach(boundary => {
      if (['Lease limit', 'Overlay limit'].includes(boundary.properties.featurecla)) return;
      const path = convertGeoJsonToSvgPath(boundary.geometry.coordinates);
      if (boundary.properties.featurecla !== 'International boundary (verify)') path.classList.add('disputed');
      //path.setAttribute('data', boundary.properties.ADM0_A3_R+'-'+boundary.properties.ADM0_A3_L);
      // if (boundary.properties.featurecla === 'Disputed (please verify)') {path.setAttribute('stroke', 'red');}
      // if (boundary.properties.featurecla === 'Indefinite (please verify)') {path.setAttribute('stroke', 'blue');}
      // if (boundary.properties.featurecla === 'Indeterminant frontier') {path.setAttribute('stroke', 'green');}
      // if (boundary.properties.featurecla === 'International boundary (verify)') {path.setAttribute('stroke', 'black');}
      // if (boundary.properties.featurecla === 'Lease limit') {path.setAttribute('stroke', 'purple');}
      // if (boundary.properties.featurecla === 'Line of control (please verify)') {path.setAttribute('stroke', 'orange');}
      // if (boundary.properties.featurecla === 'Overlay limit') {path.setAttribute('stroke', 'yellow');}
      // if (boundary.properties.featurecla === 'Unrecognized') {path.setAttribute('stroke', 'hotpink');}
      fGID('boundaries').appendChild(path);
    });
  });
}

function drawDisputedBoundaries() {
  getJson('ne_10m_admin_0_boundary_lines_disputed_areas.json').then(boundaries => {
    boundaries.forEach(boundary => {
      if ([].includes(boundary.properties.featurecla)) return;
      const path = convertGeoJsonToSvgPath(boundary.geometry.coordinates);
      path.classList.add('disputed');
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
