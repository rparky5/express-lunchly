"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");


/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }


  /** find all customers. */
//TODO: make order by case insensitive
  static async all(searchTerm='') {
    const results = await db.query(
          `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName"
            FROM customers
            WHERE first_name ILIKE $1
            OR last_name ILIKE $1
            OR (first_name||' '||last_name) ILIKE $1
            ORDER BY last_name, first_name`,
            [`%${searchTerm}%`]
    );

    return results.rows.map(c => new Customer(c));
  }


  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
          `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
        [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }


  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }


  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
            `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
          [this.firstName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
            `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`, [
            this.firstName,
            this.lastName,
            this.phone,
            this.notes,
            this.id,
          ],
      );
    }
  }


  /** return string of customer "firstName lastName" */

  fullName() {
    return `${this.firstName} ${this.lastName}`
  }


  /** return list of top ten customers based on reservation count */

  static async topTen() {
    const results = await db.query(
      `SELECT c.id,
              first_name AS "firstName",
              last_name  AS "lastName",
              phone,
              c.notes
        FROM customers AS c
        JOIN reservations AS r
        ON c.id = r.customer_id
        GROUP BY c.id
        ORDER BY COUNT(c.id) DESC, last_name, first_name
        LIMIT 10
        `);

    return results.rows.map(c => new Customer(c));
  }

}

module.exports = Customer;
