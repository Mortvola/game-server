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

Route.group(() => {
  Route.post('', 'FilesController.uploadShaderDescriptor')
  Route.patch('/:id', 'FilesController.updateShaderDescriptor')
  Route.delete('/:id', 'FilesController.deleteShaderDescriptor')
  Route.get('/:id', 'FilesController.getShaderDescriptor')
}).prefix('/shader-descriptors')

Route.get('/shader-list', 'FilesController.getShaderList')

Route.group(() => {
  Route.post('', 'MaterialsController.uploadMaterial')
  Route.get('/:id', 'MaterialsController.getMaterial')
  Route.patch('/:id', 'MaterialsController.updateMaterial')
  Route.delete('/:id', 'MaterialsController.deleteMaterial')
}).prefix('/materials')

Route.get('/materials-list', 'MaterialsController.getMaterialList')

Route.group(() => {
  Route.post('', 'ModelsController.uploadModel')
  Route.get('/:id', 'ModelsController.getModel')
  Route.patch('/:id', 'ModelsController.updateModel')
  Route.delete('/:id', 'ModelsController.deleteModel')
}).prefix('/models')

Route.get('/models-list', 'ModelsController.getModelList')

Route.group(() => {
  Route.post('', 'TexturesController.uploadTexture')
  Route.get('/:id', 'TexturesController.getTexture')
  Route.patch('/:id', 'TexturesController.updateTexture')
  Route.get('/:id/file', 'TexturesController.getTextureFile')
  Route.delete('/:id', 'TexturesController.deleteTexture')
}).prefix('/textures')

Route.get('/textures-list', 'TexturesController.getTextureList')

Route.group(() => {
  Route.post('', 'GameObjectsController.uploadGameObject')
  Route.get('/:id', 'GameObjectsController.getGameObject')
  Route.delete('/:id', 'GameObjectsController.deleteGameObject')
  Route.patch('/:id', 'GameObjectsController.updateGameObject')
}).prefix('/game-objects')

Route.get('game-objects-list', 'GameObjectsController.getGameObjectList')

Route.group(() => {
  Route.get('', 'FoldersController.getFolder')
  Route.get('/:id', 'FoldersController.getFolder')
  Route.post('', 'FoldersController.makeFolder')
  Route.patch('/:id', 'FoldersController.updateFolder')
  Route.delete('/:id', 'FoldersController.deleteItem')
}).prefix('/folders')
