import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TutorialButton'

const RegisterNow = () => {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/register')} className="button-28">
      Register Now
    </button>
  );
};

export default RegisterNow;
