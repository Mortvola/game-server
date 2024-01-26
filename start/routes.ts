/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer''
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async ({ view }) => {
  return view.render('welcome')
})

Route.post('/shader-descriptors', 'FilesController.uploadShaderDescriptor')
Route.patch('/shader-descriptors/:id', 'FilesController.updateShaderDescriptor')
Route.delete('/shader-descriptors/:id', 'FilesController.deleteShaderDescriptor')
Route.get('/shader-descriptors/:id', 'FilesController.getShaderDescriptor')

Route.post('/materials', 'MaterialsController.uploadMaterial')
Route.get('/materials/:id', 'MaterialsController.getMaterial')
Route.delete('/materials/:id', 'MaterialsController.deleteMaterial')
Route.get('/materials-list', 'MaterialsController.getMaterialList')

Route.get('/shader-list', 'FilesController.getShaderList')

Route.post('/models', 'ModelsController.uploadModel')
Route.get('/models/:id', 'ModelsController.getModel')
Route.delete('/models/:id', 'ModelsController.deleteModel')
Route.get('/models-list', 'ModelsController.getModelList')

Route.post('/textures', 'TexturesController.uploadTexture')
Route.get('/textures/:id', 'TexturesController.getTexture')
Route.delete('/textures/:id', 'TexturesController.deleteTexture')
Route.get('/textures-list', 'TexturesController.getTextureList')

Route.post('/game-objects', 'GameObjectsController.uploadGameObject')
Route.get('/game-objects/:id', 'GameObjectsController.getGameObject')
Route.delete('/game-objects/:id', 'GameObjectsController.deleteGameObject')
Route.patch('/game-objects/:id', 'GameObjectsController.updateGameObject')
Route.get('/game-objects-list', 'GameObjectsController.getGameObjectList')
