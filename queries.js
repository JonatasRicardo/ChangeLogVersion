const jsonmergepatch = require('json-merge-patch');
const Pool = require('pg').Pool

const pool = new Pool({
  user: 'me',
  host: 'localhost',
  database: 'api',
  password: 'password',
  port: 5432,
})

const getUsers = (request, response) => {
  pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}
const getPatches = (request, response) => {
  pool.query('SELECT * FROM userPatches ORDER BY id ASC', (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const getUserById = (request, response) => {
  const id = parseInt(request.params.id)
  findUserById(id, (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const getUserPatchesById = (request, response) => {
  const id = parseInt(request.params.id)
  findUserPatchesById(id, (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const findUserById = async (userId, callback) => {
  const QUERY = 'SELECT * FROM users WHERE id = $1'
  'SELECT * FROM users WHERE id = $1'
  if (typeof callback === 'function') {
    await pool.query(QUERY, [userId], callback)
  } else {
    let results = null;
    try {
        results = await pool.query(QUERY, [userId])
    } catch(e) {
      throw e
    }
  
    if (typeof results.rows == 'undefined') throw new Error(`Unnable to find the user: ${userId}`);
    return results.rows[0];
  }
}

const findUserPatchesById = async (userId, callback) => {
  const QUERY = 'SELECT * FROM userPatches WHERE userId=$1'
  await pool.query(QUERY, [userId], callback)
}

const findPatchById = async (patchId, userId, callback) => {
  const QUERY = 'SELECT * FROM userPatches WHERE id = $1 and userId=$2'
  if (typeof callback === 'function') {
    await pool.query(QUERY, [patchId, userId], callback)
  } else {
    let results = null;

    try {
        results = await pool.query(QUERY, [patchId, userId])
    } catch(e) {
      throw e
    }
  
    if (results.rowCount === 0) throw new Error(`Unnable to find the patch: ${patchId} for the given user: ${userId}`);
    return results.rows[0];
  }
}

const createUser = (request, response) => {
  const { name, email } = request.body

  pool.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email], (error, results) => {
    if (error) {
      throw error
    } else if (!Array.isArray(results.rows) || results.rows.length < 1) {
    	throw error
    }
    response.status(201).send(`User added with ID: ${results.rows[0].id}`)
  })
}

const updateUser = async (request, response) => {
  const id = parseInt(request.params.id)
  const { name, email } = request.body
  const user = await findUserById(id)
  var patch = jsonmergepatch.generate({ name, email }, user)
  
  pool.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
    [name, email, id],
    (error, results) => {
      if (error) {
        throw error
      } 
      if (typeof results.rows == 'undefined') {
      	response.status(404).send(`Resource not found`);
      } else if (Array.isArray(results.rows) && results.rows.length < 1) {
      	response.status(404).send(`User not found`);
      } else {
        savePatch(id, patch)
  	 	  response.status(200).send(`User modified with ID: ${results.rows[0].id}`)         	
      }
      
    }
  )
}

const savePatch = (id, patch) => {
  pool.query('INSERT INTO userPatches (userId, patch) VALUES ($1, $2) RETURNING *', [id, patch], (error, results) => {
    if (error) {
      throw error
    } else if (!Array.isArray(results.rows) || results.rows.length < 1) {
    	throw error
    }
    console.log(`Patch added with ID: ${results.rows[0].id}`, patch)
  })
}
const restoreUser = async (request, response) => {
  try {
    const userId = parseInt(request.params.id)
    const patchId = parseInt(request.params.patchId)
    const savedPatch = await findPatchById(patchId, userId)
    const user = await findUserById(userId)

    console.log('Saved User', user, '\nSaved Patch', savedPatch)
    const userToSave = jsonmergepatch.apply(user, savedPatch.patch)
    console.log('\nUser to save', userToSave)
  
    pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [userToSave.name, userToSave.email, userId],
      (error, results) => {
        if (error) {
          throw error
        } 
        if (typeof results.rows == 'undefined') {
          response.status(404).send(`Resource not found`);
        } else if (Array.isArray(results.rows) && results.rows.length < 1) {
          response.status(404).send(`User not found`);
        } else {
          response.status(200).send(`User modified with ID: ${results.rows[0].id}`)         	
        }
        
      }
    )
  } catch(e) {
    response.status(500).send(`Failed to restore the patch: ${e}`)
  }
}

const deleteUser = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).send(`User deleted with ID: ${id}`)
  })
}

module.exports = {
  getUsers,
  getPatches,
  getUserById,
  getUserPatchesById,
  createUser,
  updateUser,
  deleteUser,
  restoreUser
}
