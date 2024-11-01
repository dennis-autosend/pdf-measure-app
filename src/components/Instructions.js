import React from 'react';
import { FaRuler, FaDrawPolygon, FaInfoCircle } from 'react-icons/fa';
import '../styles/Instructions.css';

const Instructions = () => {
  return (
    <div className="instructions-container">
      <div className="instructions-header">
        <FaInfoCircle />
        <h3>How to Use This Tool</h3>
      </div>
      
      <div className="instructions-steps">
        <div className="instruction-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Upload Your Image</h4>
            <p>Start by uploading an aerial or landscape image you want to measure.</p>
          </div>
        </div>

        <div className="instruction-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Set the Scale</h4>
            <p>Click "Set Scale" and double-click two points on a known distance (like a property line). Enter the real-world distance between these points.</p>
          </div>
        </div>

        <div className="instruction-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Take Measurements</h4>
            <div className="measurement-types">
              <div className="measurement-type">
                <FaRuler />
                <span>Distance Tool: Click start and end points</span>
              </div>
              <div className="measurement-type">
                <FaDrawPolygon />
                <span>Area Tool: Click points to outline an area</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pro-tip">
        <span className="tip-label">💡 Pro Tip</span>
        <p>For best results, use an image with clear reference points and known distances.</p>
      </div>
    </div>
  );
};

export default Instructions; 