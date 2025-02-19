import React from 'react';
import MenuBar from '../MenuBar';
import "./registerPage.css"
import pic1 from '../pictures/pic1.png'
import pic2 from '../pictures/pic2.png'
import pic3 from '../pictures/pic3.png'
import pic4 from '../pictures/pic4.png'
import pic5 from '../pictures/pic5.png'
import pic6 from '../pictures/pic6.png'
import pic7 from '../pictures/pic7.png'
import pic8 from '../pictures/pic8.png'
import pic9 from '../pictures/pic9.png'



const RegisterPage = () => {
  return (
    <div>
      <MenuBar />
      <div className="register-wrapper">  
        
        {/* the left */}
        <div className="register-form">
          <h2 className='title-header'>Early Access Registration</h2>
          <h3 className='texts'>Name</h3>
          <div className="first-last">
            
              <input type="text" placeholder="First" className="input-field" />
              <input type="text" placeholder="Last" className="input-field" />
          </div>

          <h3 className='texts'>Date of Birth</h3>
          <div className='DOB'>
            <input type="text" placeholder="Month" className="input-field" />
            <input type="text" placeholder="Day" className="input-field" />
            <input type="text" placeholder="Year" className="input-field" />

          </div>


            <h3 className='texts'>Email Address</h3>

          <div className="email-container">
            <input type="text" placeholder="example@email.com" className="input-field" />
          </div>
            <h3 className='texts'>Phone Number</h3>

          <div className="email-container">
            <input type="text" placeholder="(XXX)-XXX-XXXX" className="input-field" />
          </div>
          <h3 className='texts'>Username</h3>
          <div className="email-container">
            <input type="text" placeholder="Username" className="input-field" />
          </div>
          <h3 className='texts'>Password</h3>
          <div className="email-container">
            <input type="text" placeholder="Password" className="input-field" />
          </div>
          <h3 className='texts'>Confirm Password</h3>
          <div className="email-container">
            <input type="text" placeholder="Password" className="input-field" />
          </div>

          <button className='button-23'>Register</button>
        </div>

        {/* right side */}
        <div className="logo-section">
          <h2>Select a Profile Picture</h2>
          <p className='picture-change'>You may change this at any time</p>
          <div className="logo-grid">
            {[pic1, pic2, pic3, pic4, pic5, pic6, pic7, pic8, pic9].map((logo, index) => (
              <div key={index} className="logo-item">
                <img src={logo} alt={`Logo ${index + 1}`} className="logo-image" />
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
};

export default RegisterPage;
