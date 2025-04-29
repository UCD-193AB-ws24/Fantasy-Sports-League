/*!

=========================================================
* Paper Kit React - v1.3.2
=========================================================

* Product Page: https://www.creative-tim.com/product/paper-kit-react

* Copyright 2023 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/paper-kit-react/blob/main/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container } from "reactstrap";
// reactstrap components

// core components

const CrossfadeImage = ({ src, alt, duration = 1000 }) => {
  const [current, setCurrent] = useState(src);
  const [next, setNext]       = useState(null);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (src !== current) {
      setNext(src);
      setOpacity(0);
      const fadeIn = setTimeout(() => setOpacity(1), 50);
      const swap   = setTimeout(() => {
        setCurrent(src);
        setNext(null);
        setOpacity(0);
      }, duration + 50);
      return () => {
        clearTimeout(fadeIn);
        clearTimeout(swap);
      };
    }
  }, [src, current, duration]);

  const imgStyle = {
    position:   "absolute",
    top:        0,
    left:       0,
    width:      "100%",
    height:     "100%",
    objectFit:  "cover",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img src={current} alt={alt} style={{ ...imgStyle, opacity: 1 }} />
      {next && (
        <img
          src={next}
          alt={alt}
          style={{
            ...imgStyle,
            opacity,
            transition: `opacity ${duration}ms ease-in-out`
          }}
        />
      )}
    </div>
  );
};

/**
 * ProfilePageHeader
 * Displays a rotating, crossfading background with parallax effect.
 */
function ProfilePageHeader() {
  const pageHeader         = useRef(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  // List your profile header backgrounds here:
  const images = [
    '/profile_page_pictures/image2.jpg'
  ];

  // rotate every 7s
  useEffect(() => {
    const iv = setInterval(() => {
      setCurrentImageIdx(i => (i + 1) % images.length);
    }, 7000);
    return () => clearInterval(iv);
  }, [images.length]);

  // parallax on small devices
  useEffect(() => {
    if (window.innerWidth < 991) {
      const onScroll = () => {
        const offset = window.pageYOffset / 3;
        if (pageHeader.current) {
          pageHeader.current.style.transform = `translate3d(0,${offset}px,0)`;
        }
      };
      window.addEventListener("scroll", onScroll);
      return () => window.removeEventListener("scroll", onScroll);
    }
  }, []);

  return (
    <div
      className="page-header page-header-xs"
      data-parallax={true}
      ref={pageHeader}
      style={{ position: "relative", height: "40vh", overflow: "hidden" }}
    >
      {/* crossfading background */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1
      }}>
        <CrossfadeImage
          src={images[currentImageIdx]}
          alt="Profile Background"
          duration={1000}
        />
      </div>

      {/* dark overlay */}
      <div className="filter" style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 2
      }}/>

      {/* you can insert avatar/title here at zIndex 3 if desired */}
      <div style={{ position: "relative", zIndex: 3 }} />
    </div>
  );
}

export default ProfilePageHeader;