/**
 * DatabaseHandler - MySQL database operations and utilities
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class DatabaseHandler {
  /**
   * Create MySQL connection
   * @param {object} config - MySQL connection config
   * @returns {Promise<Connection>}
   */
  static async createConnection(config) {
    try {
      const connection = await mysql.createConnection({
        host: config.host || 'localhost',
        user: config.user,
        password: config.password,
        database: config.database,
        multipleStatements: true
      });

      return connection;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  /**
   * Test database connection
   * @param {object} config - MySQL connection config
   * @returns {Promise<boolean>}
   */
  static async testConnection(config) {
    try {
      const connection = await this.createConnection(config);
      await connection.ping();
      await connection.end();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Export database to SQL file
   * @param {object} config - MySQL connection config
   * @param {string} outputPath - Output SQL file path
   * @returns {Promise<{success: boolean, path: string, size: number}>}
   */
  static async exportDatabase(config, outputPath) {
    try {
      const connection = await this.createConnection(config);

      // Get all tables
      const [tables] = await connection.query(
        `SHOW TABLES FROM \`${config.database}\``
      );

      let sqlDump = `-- MySQL dump for database: ${config.database}\n`;
      sqlDump += `-- Generated on: ${new Date().toISOString()}\n\n`;
      sqlDump += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
      sqlDump += `SET time_zone = "+00:00";\n\n`;
      sqlDump += `CREATE DATABASE IF NOT EXISTS \`${config.database}\`;\n`;
      sqlDump += `USE \`${config.database}\`;\n\n`;

      // Export each table
      for (const tableRow of tables) {
        const tableName = Object.values(tableRow)[0];

        // Get CREATE TABLE statement
        const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
        sqlDump += `--\n-- Table structure for \`${tableName}\`\n--\n\n`;
        sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlDump += createTable[0]['Create Table'] + ';\n\n';

        // Get table data
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);

        if (rows.length > 0) {
          sqlDump += `--\n-- Dumping data for \`${tableName}\`\n--\n\n`;

          const columns = Object.keys(rows[0]);
          const columnList = columns.map(col => `\`${col}\``).join(', ');

          for (const row of rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'number') return value;
              return `'${this.escapeString(String(value))}'`;
            }).join(', ');

            sqlDump += `INSERT INTO \`${tableName}\` (${columnList}) VALUES (${values});\n`;
          }

          sqlDump += '\n';
        }
      }

      await connection.end();

      // Write to file
      await fs.writeFile(outputPath, sqlDump);

      const stats = await fs.stat(outputPath);

      return {
        success: true,
        path: outputPath,
        size: stats.size
      };
    } catch (error) {
      throw new Error(`Failed to export database: ${error.message}`);
    }
  }

  /**
   * Import database from SQL file
   * @param {object} config - MySQL connection config
   * @param {string} sqlFilePath - SQL file path
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async importDatabase(config, sqlFilePath) {
    try {
      const connection = await this.createConnection(config);

      // Read SQL file
      const sql = await fs.readFile(sqlFilePath, 'utf8');

      // Split into individual statements (basic splitting)
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (error) {
          // Log error but continue (some statements might fail harmlessly)
          console.error(`Statement failed: ${statement.substring(0, 50)}... - ${error.message}`);
        }
      }

      await connection.end();

      return {
        success: true,
        message: `Database imported successfully from ${path.basename(sqlFilePath)}`
      };
    } catch (error) {
      throw new Error(`Failed to import database: ${error.message}`);
    }
  }

  /**
   * Create database
   * @param {object} config - MySQL connection config (without database)
   * @param {string} databaseName - Database name to create
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async createDatabase(config, databaseName) {
    try {
      const connection = await mysql.createConnection({
        host: config.host || 'localhost',
        user: config.user,
        password: config.password
      });

      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
      await connection.end();

      return {
        success: true,
        message: `Database ${databaseName} created successfully`
      };
    } catch (error) {
      throw new Error(`Failed to create database: ${error.message}`);
    }
  }

  /**
   * Drop database
   * @param {object} config - MySQL connection config (without database)
   * @param {string} databaseName - Database name to drop
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async dropDatabase(config, databaseName) {
    try {
      const connection = await mysql.createConnection({
        host: config.host || 'localhost',
        user: config.user,
        password: config.password
      });

      await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await connection.end();

      return {
        success: true,
        message: `Database ${databaseName} dropped successfully`
      };
    } catch (error) {
      throw new Error(`Failed to drop database: ${error.message}`);
    }
  }

  /**
   * Get database size
   * @param {object} config - MySQL connection config
   * @returns {Promise<number>} Size in bytes
   */
  static async getDatabaseSize(config) {
    try {
      const connection = await this.createConnection(config);

      const [rows] = await connection.query(
        `SELECT SUM(data_length + index_length) AS size
         FROM information_schema.TABLES
         WHERE table_schema = ?`,
        [config.database]
      );

      await connection.end();

      return parseInt(rows[0].size || 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * List all tables in database
   * @param {object} config - MySQL connection config
   * @returns {Promise<Array<string>>}
   */
  static async listTables(config) {
    try {
      const connection = await this.createConnection(config);

      const [tables] = await connection.query(
        `SHOW TABLES FROM \`${config.database}\``
      );

      await connection.end();

      return tables.map(row => Object.values(row)[0]);
    } catch (error) {
      return [];
    }
  }

  /**
   * Update database connection strings in config files
   * @param {string} filePath - Config file path (wp-config.php, .env, etc.)
   * @param {object} newDbConfig - New database configuration
   * @returns {Promise<boolean>}
   */
  static async updateConfigFile(filePath, newDbConfig) {
    try {
      let content = await fs.readFile(filePath, 'utf8');

      // WordPress wp-config.php
      if (filePath.endsWith('wp-config.php')) {
        content = content.replace(
          /define\(\s*'DB_NAME',\s*'[^']*'\s*\);/,
          `define('DB_NAME', '${newDbConfig.database}');`
        );
        content = content.replace(
          /define\(\s*'DB_USER',\s*'[^']*'\s*\);/,
          `define('DB_USER', '${newDbConfig.user}');`
        );
        content = content.replace(
          /define\(\s*'DB_PASSWORD',\s*'[^']*'\s*\);/,
          `define('DB_PASSWORD', '${newDbConfig.password}');`
        );
        content = content.replace(
          /define\(\s*'DB_HOST',\s*'[^']*'\s*\);/,
          `define('DB_HOST', '${newDbConfig.host || 'localhost'}');`
        );
      }

      // .env files
      if (filePath.endsWith('.env')) {
        content = content.replace(
          /DB_DATABASE=.*/,
          `DB_DATABASE=${newDbConfig.database}`
        );
        content = content.replace(
          /DB_USERNAME=.*/,
          `DB_USERNAME=${newDbConfig.user}`
        );
        content = content.replace(
          /DB_PASSWORD=.*/,
          `DB_PASSWORD=${newDbConfig.password}`
        );
        content = content.replace(
          /DB_HOST=.*/,
          `DB_HOST=${newDbConfig.host || 'localhost'}`
        );
      }

      await fs.writeFile(filePath, content);
      return true;
    } catch (error) {
      throw new Error(`Failed to update config file: ${error.message}`);
    }
  }

  /**
   * Escape string for SQL
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeString(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x00/g, '\\0')
      .replace(/\x1a/g, '\\Z');
  }
}

module.exports = DatabaseHandler;
