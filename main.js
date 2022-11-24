import "ol/ol.css";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import View from "ol/View";
import { Fill, Style } from "ol/style";
import { MultiPolygon } from "ol/geom";
import { OSM, Stamen, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { createEmpty, extend as extendExtent } from "ol/extent";
import { fromLonLat } from "ol/proj";
import { getVectorContext } from "ol/render";

//A distinct className is required to use another canvas for the background
const background = new TileLayer({
  source: new Stamen({
    layer: "toner",
  }),
});

const base = new TileLayer({
  className: "base",
  source: new OSM(),
});

fetch("data/switzerland.geojson")
  .then((response) => response.json())
  .then((data) => {
    const switzerlandFeature = new GeoJSON().readFeatures(data);
    const clipLayer = new VectorLayer({
      style: null,
      source: new VectorSource({
        features: switzerlandFeature,
      }),
    });
    //Giving the clipped layer an extent is necessary to avoid rendering when the feature is outside the viewport
    clipLayer.getSource().on("addfeature", function (e) {
      const extent = base.getExtent() || createEmpty();
      extendExtent(extent, e.feature.getGeometry().getExtent());
      base.setExtent(extent);
    });

    const style = new Style({
      fill: new Fill({
        color: "black",
      }),
    });

    base.on("postrender", function (e) {
      const polygons = [];
      clipLayer.getSource().forEachFeature(function (feature) {
        const geometry = feature.getGeometry();
        const type = geometry.getType();
        if (type === "Polygon") {
          polygons.push(geometry.getCoordinates());
        } else if (type === "MultiPolygon") {
          Array.prototype.push.apply(polygons, geometry.getCoordinates());
        }
      });
      e.context.globalCompositeOperation = "destination-in";
      const vectorContext = getVectorContext(e);
      vectorContext.setStyle(style);
      vectorContext.drawGeometry(new MultiPolygon(polygons));
      e.context.globalCompositeOperation = "source-over";
    });

    const map = new Map({
      layers: [background, base, clipLayer],
      target: "map",
      view: new View({
        center: fromLonLat([8.23, 46.86]),
        zoom: 6,
      }),
    });
  });
