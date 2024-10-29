import React from 'react';
import { FaRuler, FaDrawPolygon, FaTrash } from 'react-icons/fa';
import '../styles/MeasurementTools.css';

function MeasurementTools({ 
  measurementMode, 
  setMeasurementMode,
  measurements,
  onDeleteMeasurement,
  isDrawing,
  setMeasurements
}) {
  const handleLabelChange = (index, newLabel) => {
    const newMeasurements = [...measurements];
    newMeasurements[index] = {
      ...newMeasurements[index],
      label: newLabel
    };
    setMeasurements(newMeasurements);
  };

  return (
    <div className="measurement-tools">
      <div className="tool-buttons">
        <button
          className={`tool-button ${measurementMode === 'distance' ? 'active' : ''}`}
          onClick={() => setMeasurementMode(measurementMode === 'distance' ? null : 'distance')}
          disabled={isDrawing}
        >
          <FaRuler />
          <span>Distance</span>
        </button>
        <button
          className={`tool-button ${measurementMode === 'area' ? 'active' : ''}`}
          onClick={() => setMeasurementMode(measurementMode === 'area' ? null : 'area')}
          disabled={isDrawing}
        >
          <FaDrawPolygon />
          <span>Area</span>
        </button>
      </div>

      {measurements.length > 0 && (
        <div className="measurements-list">
          <h3>Measurements</h3>
          {measurements.map((measurement, index) => (
            <div key={index} className="measurement-item">
              <div className="measurement-content">
                <input
                  type="text"
                  value={measurement.label || `${measurement.type === 'distance' ? 'Distance' : 'Area'} ${index + 1}`}
                  onChange={(e) => handleLabelChange(index, e.target.value)}
                  className="measurement-label"
                />
                <span className="measurement-value">
                  {measurement.type === 'distance' 
                    ? `${measurement.value.toFixed(2)} ft` 
                    : `${measurement.value.toFixed(2)} sq ft`}
                </span>
                <button 
                  className="delete-btn"
                  onClick={() => onDeleteMeasurement(index)}
                  title="Delete measurement"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MeasurementTools;
