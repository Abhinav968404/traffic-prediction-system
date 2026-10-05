import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");

        if (!email || !password) {
            setError("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:3000/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            // Save authentication data
            localStorage.setItem("token", data.token);
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            // Go to TraffIQ home
            navigate("/");

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            <div className="auth-card">

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

                    <h1>Welcome Back</h1>

                    <p>
                        Login to continue your smarter journey.
                    </p>

                </div>


                {/* ERROR */}
                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}


                {/* FORM */}
                <form onSubmit={handleLogin}>

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
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                        />

                    </div>


                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Logging in..."
                            : "Login →"}
                    </button>

                </form>


                {/* REGISTER LINK */}
                <div className="auth-switch">

                    Don't have an account?

                    <Link to="/register">
                        Register
                    </Link>

                </div>

            </div>

        </div>
    );
}

export default Login;