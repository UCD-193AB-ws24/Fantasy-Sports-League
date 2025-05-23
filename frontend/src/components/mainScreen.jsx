import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../AuthContext";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Form,
  Input,
  InputGroupText,
  InputGroup,
  Container,
  Row,
  Col,
} from "reactstrap";
import MenuBar from "./MenuBar";
import LandingPageHeader from "./mainScreenTemplateDemos/LandingPageHeader.jsx";
import DemoFooter from "./mainScreenTemplateDemos/DemoFooter.jsx";
import "bootstrap/dist/css/bootstrap.min.css";

function MainScreen() {
  const navigate = useNavigate();
  React.useEffect(() => {
    // Ensure we're in the correct state
    document.documentElement.classList.remove("nav-open");
    document.body.classList.add("profile-page");

    // Dynamically load the Paper Kit CSS (assumes the file is in public/assets/css/)
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/css/paper-kit.css";
    document.head.appendChild(link);

    // Inject an override style that forces Montserrat (18px) on the MenuBar only
    const styleOverride = document.createElement("style");
    styleOverride.type = "text/css";
    styleOverride.innerHTML = `
      body.profile-page #MenuBarWrapper,
      body.profile-page #MenuBarWrapper * {
        font-family: 'Montserrat', sans-serif !important;
        font-size: 15px !important;
      }
    `;
    document.head.appendChild(styleOverride);

    return () => {
      document.body.classList.remove("profile-page");
      document.head.removeChild(link);
      document.head.removeChild(styleOverride);
    };
  }, []);

  return (
    <>
      {/* Keep the MenuBar unchanged */}
      <MenuBar />

      {/* Use the LandingPageHeader from the template */}
      <LandingPageHeader />

      {/* Main content below the header */}
      <div className="main">
        {/* INFO SECTION */}
        <div className="section text-center">
          <Container>
            <Row>
              <Col md="3">
                <div className="info">
                  <div className="icon icon-info">
                  <img
                    src="public\mainpage_pictures\league.jpg"
                    alt="Icon"
                    style={{ width: '64px', height: '64px' }}/>
                  </div>
                  <div className="description">
                    <h4 className="info-title">Fantasy Leagues</h4>
                    <p className="description">
                      Join/Create a Fantasy League and compete with your friends and other players.
                    </p>
                     <Button
                      onClick={() => navigate("/Leagues")}
                      className="btn-round mr-1"
                      color="info"
                    >
                      Leagues
                    </Button>
                  </div>
                </div>
              </Col>
              <Col md="3">
                <div className="info">
                  <div className="icon icon-info">
                  <img
                    src="public\mainpage_pictures\matchups.jpg"
                    alt="Icon"
                    style={{ width: '64px', height: '64px' }}/>
                  </div>
                  <div className="description">
                    <h4 className="info-title">Matchups</h4>
                    <p className="description">
                      Face off against your friends and other players in real-time matchups.
                    </p>
                    <Button
                      onClick={() => navigate("/Matchups")}
                      className="btn-round mr-1"
                      color="info"
                    >
                      Matchups
                    </Button>
                  </div>
                </div>
              </Col>
              <Col md="3">
                <div className="info">
                  <div className="icon icon-info">
                  <img
                    src="public\mainpage_pictures\playerlist.jpg"
                    alt="Icon"
                    style={{ width: '64px', height: '64px' }}/>
                  </div>
                  <div className="description">
                    <h4 className="info-title">Player Management</h4>
                    <p className="description">
                      Sort through the available players list in your league and add them to your roster.
                    </p>
                    <Button
                      onClick={() => navigate("/PlayerList")}
                      className="btn-round mr-1"
                      color="info"
                    >
                      Player List
                    </Button>
                  </div>
                </div>
              </Col>
              <Col md="3">
                <div className="info">
                  <div className="icon icon-info">
                  <img
                    src="public\mainpage_pictures\contracts.jpg"
                    alt="Icon"
                    style={{ width: '64px', height: '64px' }}/>
                  </div>
                  <div className="description">
                    <h4 className="info-title">Player Contracts</h4>
                    <p className="description">
                      Manage player contracts and make strategic decisions to optimize your roster.
                    </p>
                    <Button
                      onClick={() => navigate("/PlayerList")}
                      className="btn-round mr-1"
                      color="info"
                    >
                      Contracts
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </div>

      <DemoFooter />
    </>
  );
}

export default MainScreen;
