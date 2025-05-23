import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container } from "reactstrap";

// A simple CrossfadeImage component that smoothly fades between src changes
const CrossfadeImage = ({ src, alt, duration = 1000 }) => {
  const [currentImage, setCurrentImage] = useState(src);
  const [nextImage, setNextImage] = useState(null);
  const [nextOpacity, setNextOpacity] = useState(0);

  useEffect(() => {
    if (src !== currentImage) {
      // Set the next image and start its opacity at 0
      setNextImage(src);
      setNextOpacity(0);
      // Initiate the fade in after a very short delay (ensuring the next image is rendered)
      const timeout = setTimeout(() => {
        setNextOpacity(1);
      }, 50);
      // After the full duration plus delay, make the next image the current image
      const timeout2 = setTimeout(() => {
        setCurrentImage(src);
        setNextImage(null);
        setNextOpacity(0);
      }, duration + 50);

      return () => {
        clearTimeout(timeout);
        clearTimeout(timeout2);
      };
    }
  }, [src, currentImage, duration]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Current Image */}
      <img
        src={currentImage}
        alt={alt}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 1
        }}
      />
      {/* Next Image for Fade In */}
      {nextImage && (
        <img
          src={nextImage}
          alt={alt}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: nextOpacity,
            transition: `opacity ${duration}ms ease-in-out`
          }}
        />
      )}
    </div>
  );
};

function LandingPageHeader() {
  const navigate = useNavigate();
  const pageHeader = useRef(null);

  // Array of background images (ensure these paths are correct and images exist in your public folder)
  const images = [
    '/mainpage_pictures/image1.jpg',
    '/mainpage_pictures/image2.jpg',
    '/mainpage_pictures/image3.jpg',
    '/mainpage_pictures/image4.jpg',
    '/mainpage_pictures/image5.jpg',
    '/mainpage_pictures/image6.jpg',
    '/mainpage_pictures/image7.jpg',
    '/mainpage_pictures/image8.jpg',
    '/mainpage_pictures/image9.jpg'
  ];

  // State to track the current image index
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate images every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Apply parallax scroll effect for smaller screens
  useEffect(() => {
    if (window.innerWidth < 991 && pageHeader.current) {
      const updateScroll = () => {
        let windowScrollTop = window.pageYOffset / 3;
        pageHeader.current.style.transform = `translate3d(0, ${windowScrollTop}px, 0)`;
      };
      window.addEventListener("scroll", updateScroll);
      return () => window.removeEventListener("scroll", updateScroll);
    }
  }, []);

  return (
    <div
      className="page-header"
      data-parallax={true}
      ref={pageHeader}
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Background Image Container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      >
        <CrossfadeImage
          src={images[currentImageIndex]}
          alt="Header Background"
          duration={1000}
        />
      </div>

      {/* Optional filter overlay */}
      <div
        className="filter"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}
      />

      {/* Text container on top */}
      <Container style={{ position: 'relative', zIndex: 3 }}>
        <div className="motto text-center" style={{ color: '#fff' }}>
          <h1>Welcome to MyNBA Fantasy</h1>
          <h3>Start Building Your Team</h3>
          <br />
          <Button
            onClick={() => navigate("/YourRoster")}
            className="btn-round mr-1"
            color="neutral"
            outline
          >
            Your Roster
          </Button>
        </div>
      </Container>
    </div>
  );
}

export default LandingPageHeader;