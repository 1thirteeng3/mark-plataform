# Mark Backend (Node.js)

This is the backend for the Mark platform, built with Node.js and Express.js.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- PostgreSQL

### Installation

1.  Clone the repository and navigate to the `mark-backend-node` directory:

    ```bash
    git clone <repository-url>
    cd mark-backend-node
    ```

2.  Install the dependencies:

    ```bash
    npm install
    ```

3.  Create a `.env` file by copying the `.env.example` file:

    ```bash
    cp .env.example .env
    ```

4.  Update the `.env` file with your database connection details and JWT secrets.

### Running the Server

To start the development server, run:

```bash
npm start
```

The server will be running on the port specified in your `.env` file (default: 3001).

### Database Setup

You will need to apply the necessary schema changes and stored procedures to your database. The SQL files are located in the `mark-backend` directory of the repository. You can apply them to your database using a tool like `psql`.
