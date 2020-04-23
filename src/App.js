import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Map, TileLayer, GeoJSON } from "react-leaflet";
import { readString } from "react-papaparse";

// https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series
// https://arc-garc.opendata.arcgis.com/datasets/dc20713282734a73abe990995de40497_68

const process = (raw) => {
  let reader = readString(raw);
  let data = reader.data;

  let header = data[0];
  let rows = data.slice(1);

  let fips_idx = header.indexOf("FIPS");
  let first_date_index = header.indexOf("1/22/20");

  let dates = header.slice(first_date_index);
  let date_indices = [...dates.keys()].map((idx) => idx + first_date_index);

  const fips_to_case_counts = {};
  rows
    .filter((row) => row.includes("Georgia"))
    .forEach((row) => {
      let fips = parseInt(row[fips_idx]);
      fips_to_case_counts[fips] = {};
      date_indices.forEach((date_idx) => {
        fips_to_case_counts[fips][header[date_idx]] = row[date_idx];
      });
    });

  const ret_val = {
    fips_to_case_counts,
    dates,
  };

  return ret_val;
};

const mergeInCaseCounts = (data, caseData) => {
  data.features.forEach((feature) => {
    feature.properties["cases"] = caseData[feature.properties.GEOID10];
  });
  return data;
};

const getColor = (d) => {
  return d > 1000
    ? "#800026"
    : d > 500
    ? "#BD0026"
    : d > 200
    ? "#E31A1C"
    : d > 100
    ? "#FC4E2A"
    : d > 50
    ? "#FD8D3C"
    : d > 20
    ? "#FEB24C"
    : d > 10
    ? "#FED976"
    : "#FFEDA0";
};

const mouseOver = (event) => {
  var layer = event.target;
  layer.setStyle({
    weight: 1,
    color: "#666",
    dashArray: "1",
    fillOpacity: 0.9,
  });
};

const mouseOut = (event) => {
  var layer = event.target;
  layer.setStyle({
    weight: 2,
    color: "white",
    dashArray: "2",
    fillOpacity: 0.7,
  });
};

const onEachFeature = (feature, layer) => {
  layer.on({
    mouseover: mouseOver,
    mouseout: mouseOut,
  });
};

const App = () => {
  const [counties, setCounties] = useState();
  const [dates, setDates] = useState();
  const [currentDate, setCurrentDate] = useState();
  const [sliderValue, setSliderValue] = useState(50);

  useEffect(() => {
    const fetchData = async () => {
      const counties_url =
        "https://opendata.arcgis.com/datasets/dc20713282734a73abe990995de40497_68.geojson";
      const data_url =
        "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv";

      try {
        let res;

        res = await axios.get(data_url);
        let caseData = process(res.data);

        setDates(caseData.dates);
        setCurrentDate(caseData.dates[caseData.dates.length - 1]);
        setSliderValue(caseData.dates.length);

        res = await axios.get(counties_url);
        let counties_data = mergeInCaseCounts(
          res.data,
          caseData["fips_to_case_counts"]
        );
        setCounties(counties_data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, []);

  const featureStyle = (feature) => {
    let date = currentDate;
    return {
      fillColor: getColor(feature.properties.cases[date]),
      weight: 2,
      opacity: 0.5,
      color: "white",
      dashArray: "2",
      fillOpacity: 0.7,
    };
  };

  const sliderChange = (event) => {
    let val = parseInt(event.target.value);
    setSliderValue(val);
    setCurrentDate(dates[val]);
  };

  if (!counties || !dates) return <div>loading...</div>;

  return (
    <div className="App">
      <Map center={[32.7656, -83.3]} zoom={8} style={{ height: "1000px" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GeoJSON
          data={counties}
          style={featureStyle}
          onEachFeature={onEachFeature}
        />
      </Map>
      <input
        id="dateSlider"
        type="range"
        min="0"
        max={dates.length - 1}
        value={sliderValue}
        onChange={sliderChange}
      />
      <div>
        <strong>{currentDate}</strong>
      </div>
    </div>
  );
};

export default App;
