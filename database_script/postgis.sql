## create userinformation table

CREATE TABLE userinformation (
    id SERIAL PRIMARY KEY,
    userName TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- store hashed password
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);