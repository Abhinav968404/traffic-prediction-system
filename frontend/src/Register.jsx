import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!name || !email || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:3000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Registration failed"
                );
            }

            setSuccess(
                "Registration successful! Redirecting to login..."
            );

            setTimeout(() => {
                navigate("/login");
            }, 1200);

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            <div className="auth-card register-card">

                {/* BRAND */}
                <div className="auth-brand">

                    <div className="auth-logo">
                        🚦
                    </div>

                    <div>

                        <div className="auth-logo-name">
                            Traff<span>IQ</span>
                        </div>

                        <div className="auth-tagline">
                            SMARTER JOURNEYS
                        </div>

                    </div>

                </div>


                {/* HEADING */}
                <div className="auth-heading">

                    <h1>Create Account</h1>

                    <p>
                        Start planning smarter journeys today.
                    </p>

                </div>


                {/* ERROR */}
                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}


                {/* SUCCESS */}
                {success && (
                    <div className="auth-success">
                        {success}
                    </div>
                )}


                {/* FORM */}
                <form onSubmit={handleRegister}>

                    <div className="auth-input-group">

                        <label>FULL NAME</label>

                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) =>
                                setName(e.target.value)
                            }
                        />

                    </div>


                    <div className="auth-input-group">

                        <label>EMAIL</label>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                        />

                    </div>


                    <div className="auth-input-group">

                        <label>PASSWORD</label>

                        <input
                            type="password"
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                        />

                    </div>


                    <div className="auth-input-group">

                        <label>CONFIRM PASSWORD</label>

                        <input
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                        />

                    </div>


                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating account..."
                            : "Create Account →"}
                    </button>

                </form>


                {/* LOGIN LINK */}
                <div className="auth-switch">

                    Already have an account?

                    <Link to="/login">
                        Login
                    </Link>

                </div>

            </div>

        </div>
    );
}

export default Register;